import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { Readable } from 'stream';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

@Injectable()
export class FalService {
  private storage = UploadFactory.createStorage();

  async generateImageFromText(
    model: string,
    text: string,
    isVertical: boolean = false
  ): Promise<string> {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ text }],
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });

    const part = result.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData
    );

    if (!part?.inlineData) {
      throw new Error('Gemini image generation failed');
    }

    const buffer = Buffer.from(part.inlineData.data!, 'base64');
    const { path } = await this.storage.uploadFile({
      buffer,
      mimetype: 'image/png',
      size: buffer.length,
      path: '',
      fieldname: '',
      destination: '',
      stream: new Readable(),
      filename: '',
      originalname: '',
      encoding: '',
    });

    return path.indexOf('http') === -1
      ? process.env.FRONTEND_URL +
        '/' +
        process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY +
        path
      : path;
  }
}
