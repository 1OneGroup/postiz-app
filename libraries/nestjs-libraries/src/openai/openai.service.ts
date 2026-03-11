import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Readable } from 'stream';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { shuffle } from 'lodash';
import { z } from 'zod';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const PicturePrompt = z.object({
  prompt: z.string(),
});

const VoicePrompt = z.object({
  voice: z.string(),
});

@Injectable()
export class OpenaiService {
  private storage = UploadFactory.createStorage();

  async generateImage(prompt: string, isUrl: boolean, isVertical = false) {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ text: prompt }],
      config: { responseModalities: ['IMAGE', 'TEXT'] },
    });
    const part = result.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData
    );
    if (!part?.inlineData) throw new Error('Image generation failed');
    if (!isUrl) return part.inlineData.data;
    const buffer = Buffer.from(part.inlineData.data!, 'base64');
    const { path } = await this.storage.uploadFile({
      buffer,
      mimetype: 'image/png',
      size: buffer.length,
      path: '',
      fieldname: '',
      destination: '',
      stream: new Readable(),
      filename: 'image.png',
      originalname: 'image.png',
      encoding: '',
    });
    return path.indexOf('http') === -1
      ? process.env.FRONTEND_URL +
          '/' +
          process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY +
          path
      : path;
  }

  async generatePromptForPicture(prompt: string) {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an assistant that take a description and style and generate a prompt that will be used later to generate images, make it a very long and descriptive explanation, and write a lot of things for the renderer like, if it's realistic describe the camera\n\nprompt: ${prompt}`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: zodToJsonSchema(PicturePrompt) as any,
      },
    });
    try {
      return JSON.parse(result.text || '{}').prompt || '';
    } catch {
      return '';
    }
  }

  async generateVoiceFromText(prompt: string) {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an assistant that takes a social media post and convert it to a normal human voice, to be later added to a character, when a person talk they don't use "-", and sometimes they add pause with "..." to make it sounds more natural, make sure you use a lot of pauses and make it sound like a real person\n\nprompt: ${prompt}`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: zodToJsonSchema(VoicePrompt) as any,
      },
    });
    try {
      return JSON.parse(result.text || '{}').voice || '';
    } catch {
      return '';
    }
  }

  async generatePosts(content: string) {
    const [singleResults, threadResults] = await Promise.all([
      Promise.all(
        Array(5)
          .fill(null)
          .map(() =>
            ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Generate a Twitter post from the content without emojis in the following JSON format: { "post": string } put it in an array with one element\n\n${content}`,
              config: { temperature: 1 },
            })
          )
      ),
      Promise.all(
        Array(5)
          .fill(null)
          .map(() =>
            ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Generate a thread for social media in the following JSON format: Array<{ "post": string }> without emojis\n\n${content}`,
              config: { temperature: 1 },
            })
          )
      ),
    ]);

    const allTexts = [...singleResults, ...threadResults].map(
      (r) => r.text || ''
    );

    return shuffle(
      allTexts.map((text) => {
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        try {
          return JSON.parse(
            '[' +
              text
                .slice(start + 1, end)
                .replace(/\n/g, ' ')
                .replace(/ {2,}/g, ' ') +
              ']'
          );
        } catch (e) {
          return [];
        }
      })
    );
  }

  async extractWebsiteText(content: string) {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You take a full website text, and extract only the article content\n\n${content}`,
    });
    const articleContent = result.text || '';
    return this.generatePosts(articleContent);
  }

  async separatePosts(content: string, len: number) {
    const SeparatePostsPrompt = z.object({
      posts: z.array(z.string()),
    });

    const SeparatePostPrompt = z.object({
      post: z.string().max(len),
    });

    const postsResult = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an assistant that take a social media post and break it to a thread, each post must be minimum ${
        len - 10
      } and maximum ${len} characters, keeping the exact wording and break lines, however make sure you split posts based on context\n\n${content}`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: zodToJsonSchema(SeparatePostsPrompt) as any,
      },
    });

    const posts: string[] = (() => {
      try {
        return JSON.parse(postsResult.text || '{}').posts || [];
      } catch {
        return [];
      }
    })();

    return {
      posts: await Promise.all(
        posts.map(async (post: any) => {
          if (post.length <= len) {
            return post;
          }

          let retries = 4;
          while (retries) {
            try {
              const shrinkResult = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `You are an assistant that take a social media post and shrink it to be maximum ${len} characters, keeping the exact wording and break lines\n\n${post}`,
                config: {
                  responseMimeType: 'application/json',
                  responseJsonSchema: zodToJsonSchema(
                    SeparatePostPrompt
                  ) as any,
                },
              });
              return JSON.parse(shrinkResult.text || '{}').post || '';
            } catch (e) {
              retries--;
            }
          }

          return post;
        })
      ),
    };
  }

  async generateSlidesFromText(text: string) {
    const SlidesSchema = z.object({
      slides: z
        .array(
          z.object({
            imagePrompt: z.string(),
            voiceText: z.string(),
          })
        )
        .describe('an array of slides'),
    });

    for (let i = 0; i < 3; i++) {
      try {
        const message = `You are an assistant that takes a text and break it into slides, each slide should have an image prompt and voice text to be later used to generate a video and voice, image prompt should capture the essence of the slide and also have a back dark gradient on top, image prompt should not contain text in the picture, generate between 3-5 slides maximum`;
        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `${message}\n\n${text}`,
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: zodToJsonSchema(SlidesSchema) as any,
          },
        });
        const parsed = JSON.parse(result.text || '{}').slides || [];
        return parsed;
      } catch (err) {
        console.log(err);
      }
    }

    return [];
  }
}
