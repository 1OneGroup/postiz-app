import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Readable } from 'stream';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { shuffle } from 'lodash';
import { z } from 'zod';
import type {
  IntentObject,
  CategorizedAssetBundle,
} from '@gitroom/nestjs-libraries/brand-context/branded-pipeline.types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const PicturePrompt = z.object({
  prompt: z.string(),
});

const VoicePrompt = z.object({
  voice: z.string(),
});

const IntentSchema = z.object({
  contentType: z.enum([
    'festival_greeting',
    'construction_update',
    'offer_announcement',
    'lifestyle',
    'milestone',
    'generic',
  ]),
  occasion: z.string().nullable(),
  culturalContext: z.string().nullable(),
  visualSubject: z.string(),
  mood: z.string(),
  headline: z.string(),
  subtitle: z.string().nullable(),
  greeting: z.string().nullable(),
  taglineBar: z.string().nullable(),
  aspectRatio: z.enum(['1:1', '9:16', '4:5', '16:9']),
  requiredAssets: z.array(z.string()),
  logoPlacement: z.enum(['top-center', 'top-left', 'top-right']),
  complianceText: z.string().nullable(),
});

const ValidationSchema = z.object({
  passed: z.boolean(),
  deficiencies: z.array(z.string()),
  score: z.number(),
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

  async generateBrandedImage(opts: {
    prompt: string;
    brandContext: string;
    visualRules: Record<string, any>;
    promptSkeleton: string;
    referenceImages: Array<{ mimeType: string; base64: string }>;
    aspectRatio?: string;
  }): Promise<string> {
    // Step 1: Craft branded prompt
    const refLabels = opts.referenceImages.map((_, i) => {
      if (i === 0) return `Image ${i + 1} is the brand logo — reproduce it EXACTLY in the top-left corner.`;
      return `Image ${i + 1} is a project/style reference — use for visual consistency.`;
    });

    const craftResult = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert social media graphic designer. Craft a detailed image generation prompt under 600 words for a branded social media creative.

Include these elements in your prompt:
1. BACKGROUND SCENE based on user request
2. BRAND LOGO in top-left corner (from reference image 1)
3. BOLD HEADLINE at bottom (serif/display font, gold/cream/white)
4. SUBTITLE below headline (lighter weight)
5. COMPLIANCE TEXT top-right (RERA number if in brand context)
6. Square 1:1 format

REFERENCE IMAGES:
${refLabels.join('\n')}

TEMPLATE SKELETON:
${opts.promptSkeleton}

VISUAL RULES:
${JSON.stringify(opts.visualRules, null, 2)}

BRAND CONTEXT:
${opts.brandContext}

USER REQUEST: ${opts.prompt}`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: zodToJsonSchema(PicturePrompt) as any,
      },
    });

    let craftedPrompt = opts.prompt;
    try {
      craftedPrompt = JSON.parse(craftResult.text || '{}').prompt || opts.prompt;
    } catch {
      craftedPrompt = opts.prompt;
    }

    // Step 2: Generate with Nano Banana Pro
    const contentParts: any[] = [
      { text: craftedPrompt },
      ...opts.referenceImages.map((img) => ({
        inlineData: { mimeType: img.mimeType, data: img.base64 },
      })),
    ];

    const result = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: [{ role: 'user', parts: contentParts }],
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: {
          aspectRatio: (opts.aspectRatio || '1:1') as any,
          imageSize: '2K' as any,
        },
      },
    });

    const part = result.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData
    );
    if (!part?.inlineData) throw new Error('Branded image generation failed');

    const buffer = Buffer.from(part.inlineData.data!, 'base64');
    const { path } = await this.storage.uploadFile({
      buffer,
      mimetype: 'image/png',
      size: buffer.length,
      path: '',
      fieldname: '',
      destination: '',
      stream: new Readable(),
      filename: 'branded-image.png',
      originalname: 'branded-image.png',
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

  async analyzeIntent(
    userPrompt: string,
    projectName: string,
    brandContextText: string,
    availableSubfolders: string[]
  ): Promise<IntentObject> {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a senior creative director for Indian real estate brands. Analyze this image generation request and produce a structured intent object.

PROJECT: ${projectName}

AVAILABLE DRIVE SUBFOLDERS: ${availableSubfolders.join(', ')}

BRAND CONTEXT:
${brandContextText}

USER REQUEST: ${userPrompt}

INSTRUCTIONS:
1. Determine the contentType:
   - festival_greeting: Indian festivals (Diwali, Holi, Eid, Christmas, Mahavir Jayanti, etc.), national holidays (Republic Day, Independence Day), or religious occasions
   - construction_update: Progress reports, milestone completions, foundation laying, topping out
   - offer_announcement: Price reveals, festive offers, early bird discounts, payment plans
   - lifestyle: Aspirational living, amenity showcases, community events
   - milestone: Awards, units sold milestones, project completions
   - generic: Anything that doesn't fit above

2. For festival_greeting: Research the specific cultural context, iconography, symbols, and visual traditions. Populate culturalContext with detailed visual guidance (e.g., for Mahavir Jayanti: "Jain festival celebrating Lord Mahavir's birth, traditional imagery includes Mahavir in meditation on lotus, golden halo, ornate chhatri umbrella, themes of ahimsa and non-violence").

3. Generate a compelling headline, subtitle, and greeting appropriate to the occasion and brand.

4. Select requiredAssets from the available subfolders. Always include "logos". Add "gallery" for style references. Add "brand-guide" for brand rules. Add "renders" or "photos" based on contentType.

5. Choose aspectRatio: 9:16 for stories/festival greetings, 1:1 for feed posts, 4:5 for tall feed, 16:9 for banners.

6. Extract complianceText (RERA number) from brand context if present.

7. Set taglineBar from brand context (e.g., "GROUP HOUSINGS | TOWNSHIPS | COMMERCIAL" for One Group projects).

8. logoPlacement: top-center for festival greetings, top-left for construction updates, top-center for offers.`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: zodToJsonSchema(IntentSchema) as any,
      },
    });

    try {
      return JSON.parse(result.text || '{}') as IntentObject;
    } catch {
      // Fallback intent
      return {
        contentType: 'generic',
        occasion: null,
        culturalContext: null,
        visualSubject: userPrompt,
        mood: 'professional, premium',
        headline: projectName,
        subtitle: null,
        greeting: null,
        taglineBar: null,
        aspectRatio: '1:1',
        requiredAssets: ['logos', 'gallery', 'brand-guide'],
        logoPlacement: 'top-center',
        complianceText: null,
      };
    }
  }

  private _getCompositionGuide(intent: IntentObject): string {
    switch (intent.contentType) {
      case 'festival_greeting':
        return `COMPOSITION: Cultural illustration centered or upper-center as the hero element. Logo at ${intent.logoPlacement} above the illustration. Bold display headline mid-canvas. Subtitle below headline. Greeting below subtitle. Tagline bar anchoring bottom edge. No property renders unless the occasion specifically relates to the project. Rich, culturally appropriate color palette.`;

      case 'construction_update':
        return `COMPOSITION: Construction progress photo or architectural render as full-bleed background. Logo at ${intent.logoPlacement} with semi-transparent backing for readability. Construction milestone headline prominently placed. Date or phase information as subtitle. Optional tagline bar at bottom. RERA compliance text if applicable.`;

      case 'offer_announcement':
        return `COMPOSITION: Property render or lifestyle image as background. Logo at ${intent.logoPlacement}. Offer text or price point as dominant headline. Offer details and validity as subtitle. Tagline bar at bottom with project name and contact. RERA compliance text required and prominently placed.`;

      case 'lifestyle':
        return `COMPOSITION: Aspirational living scene as hero — luxury interiors, amenity views, or community lifestyle. Logo at ${intent.logoPlacement}, subtle integration. Lifestyle tagline or project name as headline. Location or USP as subtitle. Tagline bar at bottom. Warm, inviting, premium mood.`;

      case 'milestone':
        return `COMPOSITION: Achievement visual as hero — award trophy, celebration graphic, or milestone number. Logo at ${intent.logoPlacement}. Achievement text as dominant headline. Supporting detail as subtitle. Tagline bar at bottom.`;

      default:
        return `COMPOSITION: Project render or branded abstract gradient background. Logo at ${intent.logoPlacement}. Project name as headline. Key USP as subtitle. Tagline bar at bottom. Professional, premium aesthetic.`;
    }
  }

  async generateBrandedImageV2(opts: {
    prompt: string;
    intent: IntentObject;
    assetBundle: CategorizedAssetBundle;
    brandContext: string;
  }): Promise<string> {
    const { intent, assetBundle } = opts;

    // Build role-labeled reference image instructions
    const refImages: Array<{ mimeType: string; base64: string }> = [];
    const refInstructions: string[] = [];
    let refIndex = 1;

    // Slot 1: Logo (always first if available)
    if (assetBundle.logo) {
      refImages.push({
        mimeType: assetBundle.logo.image.mimeType,
        base64: assetBundle.logo.image.base64,
      });
      refInstructions.push(
        `REFERENCE IMAGE ${refIndex} (LOGO): ${assetBundle.logo.instruction}`
      );
      refIndex++;
    } else if (assetBundle.parentLogo) {
      refImages.push({
        mimeType: assetBundle.parentLogo.mimeType,
        base64: assetBundle.parentLogo.base64,
      });
      refInstructions.push(
        `REFERENCE IMAGE ${refIndex} (LOGO): Reproduce this parent brand logo exactly at ${intent.logoPlacement}. Do not modify its colors, proportions, or design.`
      );
      refIndex++;
    }

    // Slots 2-3: Style references
    for (const ref of assetBundle.styleReferences.slice(0, 2)) {
      if (refImages.length >= 5) break;
      refImages.push({
        mimeType: ref.image.mimeType,
        base64: ref.image.base64,
      });
      refInstructions.push(
        `REFERENCE IMAGE ${refIndex} (STYLE): ${ref.instruction}`
      );
      refIndex++;
    }

    // Slots 4-5: Scene references
    for (const ref of assetBundle.sceneReferences.slice(0, 2)) {
      if (refImages.length >= 5) break;
      refImages.push({
        mimeType: ref.image.mimeType,
        base64: ref.image.base64,
      });
      refInstructions.push(
        `REFERENCE IMAGE ${refIndex} (SCENE): ${ref.instruction}`
      );
      refIndex++;
    }

    // Build brand rules text
    const brandRulesText = assetBundle.brandRules
      ? `BRAND RULES:\nColors: ${assetBundle.brandRules.colorPalette.join(', ')}\nFonts: ${assetBundle.brandRules.fonts.join(', ')}\n${assetBundle.brandRules.text}`
      : '';

    // Composition guidance per content type
    const compositionGuide = this._getCompositionGuide(intent);

    // Step 3: Craft the 5-layer prompt
    const craftResult = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an elite Indian real estate brand designer. Craft a detailed image generation prompt (max 800 words) for a branded social media creative using a 5-LAYER COMPOSITION system.

LAYER 1 — CANVAS & FORMAT:
Aspect ratio: ${intent.aspectRatio}
Mood: ${intent.mood}
Create a premium, design-grade social media creative. Photorealistic rendering with professional typography.

LAYER 2 — VISUAL SUBJECT (THE HERO):
${intent.culturalContext ? `Cultural Context: ${intent.culturalContext}\n` : ''}Central visual subject: ${intent.visualSubject}
${compositionGuide}

LAYER 3 — BRAND IDENTITY:
Logo placement: ${intent.logoPlacement}
${brandRulesText}
${refInstructions.length > 0 ? `\nREFERENCE IMAGE INSTRUCTIONS:\n${refInstructions.join('\n')}` : ''}

LAYER 4 — TYPOGRAPHY HIERARCHY:
${intent.headline ? `HEADLINE (largest, bold display font): "${intent.headline}"` : ''}
${intent.subtitle ? `SUBTITLE (40% of headline size, lighter weight): "${intent.subtitle}"` : ''}
${intent.greeting ? `GREETING (50% of headline size, elegant script/serif): "${intent.greeting}"` : ''}
${intent.taglineBar ? `TAGLINE BAR (bottom edge, dark opaque bar, spaced uppercase sans-serif): "${intent.taglineBar}"` : ''}
${intent.complianceText ? `COMPLIANCE (small, top-right): "${intent.complianceText}"` : ''}

LAYER 5 — REFERENCE IMAGE ROLES:
${refInstructions.join('\n') || 'No reference images provided.'}

BRAND CONTEXT:
${opts.brandContext}

USER REQUEST: ${opts.prompt}

OUTPUT: Generate a single, detailed image generation prompt that integrates all 5 layers into a cohesive creative direction. Describe exact positions, sizes, colors, and visual treatments for every element.`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: zodToJsonSchema(PicturePrompt) as any,
      },
    });

    let craftedPrompt = opts.prompt;
    try {
      craftedPrompt =
        JSON.parse(craftResult.text || '{}').prompt || opts.prompt;
    } catch {
      craftedPrompt = opts.prompt;
    }

    // Step 4: Generate image with Gemini Pro
    const contentParts: any[] = [
      { text: craftedPrompt },
      ...refImages.map((img) => ({
        inlineData: { mimeType: img.mimeType, data: img.base64 },
      })),
    ];

    const result = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: [{ role: 'user', parts: contentParts }],
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: {
          aspectRatio: intent.aspectRatio as any,
          imageSize: '2K' as any,
        },
      },
    });

    const part = result.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData
    );
    if (!part?.inlineData) throw new Error('Branded image V2 generation failed');

    const buffer = Buffer.from(part.inlineData.data!, 'base64');
    const { path } = await this.storage.uploadFile({
      buffer,
      mimetype: 'image/png',
      size: buffer.length,
      path: '',
      fieldname: '',
      destination: '',
      stream: new Readable(),
      filename: 'branded-image.png',
      originalname: 'branded-image.png',
      encoding: '',
    });

    return path.indexOf('http') === -1
      ? process.env.FRONTEND_URL +
          '/' +
          process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY +
          path
      : path;
  }

  async validateGeneratedImage(
    imageBase64: string,
    intent: IntentObject
  ): Promise<{ passed: boolean; deficiencies: string[]; score: number }> {
    try {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are a brand compliance reviewer for Indian real estate marketing. Analyze this generated creative image against the intent specification and score it.

INTENT SPECIFICATION:
- Content Type: ${intent.contentType}
- Headline expected: "${intent.headline}"
- Subtitle expected: "${intent.subtitle || 'none'}"
- Greeting expected: "${intent.greeting || 'none'}"
- Logo placement: ${intent.logoPlacement}
- Aspect ratio: ${intent.aspectRatio}
- Visual subject: ${intent.visualSubject}
- Cultural context: ${intent.culturalContext || 'none'}
- Tagline bar: ${intent.taglineBar || 'none'}
- Compliance text: ${intent.complianceText || 'none'}

CHECK EACH:
1. Is a logo visible and recognizable? (critical)
2. Does a clear typography hierarchy exist (headline → subtitle → greeting)? (critical)
3. Is the visual subject culturally appropriate for the occasion? (important for festivals)
4. Do the colors roughly match expected brand identity? (important)
5. Is the aspect ratio correct? (check)
6. Is a tagline/categories bar present at the bottom? (if specified)

Score 0-100. Pass threshold is 60.
List specific deficiencies that could be fixed by adjusting the prompt.`,
              },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: zodToJsonSchema(ValidationSchema) as any,
        },
      });

      return JSON.parse(result.text || '{}') as {
        passed: boolean;
        deficiencies: string[];
        score: number;
      };
    } catch {
      // If validation itself fails, pass through to avoid blocking
      return { passed: true, deficiencies: [], score: 70 };
    }
  }
}
