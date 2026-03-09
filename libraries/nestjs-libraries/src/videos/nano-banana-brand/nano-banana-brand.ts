import {
  URL,
  Video,
  VideoAbstract,
} from '@gitroom/nestjs-libraries/videos/video.interface';
import { IsString } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';
import { BrandContextService } from '@gitroom/nestjs-libraries/brand-context/brand-context.service';
import { ImageTemplatesService } from '@gitroom/nestjs-libraries/image-templates/image-templates.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Readable } from 'stream';

const CraftedPrompt = z.object({ prompt: z.string() });

class NanoBananaBrandParams {
  @JSONSchema({ description: 'Organization ID for scoping brand context queries' })
  @IsString()
  organizationId: string;

  @JSONSchema({ description: 'The ID of the image template to use for generation' })
  @IsString()
  templateId: string;

  @JSONSchema({ description: 'Brief description of what the image should show' })
  @IsString()
  prompt: string;

  @JSONSchema({ description: 'The project tag to load brand context for' })
  @IsString()
  projectTag: string;
}

@Video({
  identifier: 'nano-banana-brand',
  title: 'Branded Image (Nano Banana 2)',
  description:
    'Generate branded images using project templates and brand context. Select a template, provide a brief description, and get a professionally branded image with your logo and brand elements.',
  placement: 'text-to-image',
  tools: [],
  dto: NanoBananaBrandParams,
  trial: false,
  available: !!process.env.GEMINI_API_KEY,
})
export class NanoBananaBrand extends VideoAbstract<NanoBananaBrandParams> {
  override dto = NanoBananaBrandParams;
  private storage = UploadFactory.createStorage();

  constructor(
    private _brandContextService: BrandContextService,
    private _imageTemplatesService: ImageTemplatesService
  ) {
    super();
  }

  async process(
    output: 'vertical' | 'horizontal',
    customParams: NanoBananaBrandParams
  ): Promise<URL> {
    const { organizationId, templateId, prompt, projectTag } = customParams;

    // 1. Fetch template with resolved asset URLs
    const template = await this._imageTemplatesService.getTemplateWithAssetUrls(
      organizationId,
      templateId
    );
    if (!template) {
      throw new Error('Template not found');
    }

    // 2. Fetch brand context for project, sorted by priority descending
    const brandContexts = await this._brandContextService.findByProjectTag(
      organizationId,
      projectTag
    );
    const brandContextString = brandContexts
      .sort((a, b) => b.priority - a.priority)
      .map((c) => `[${c.type.toUpperCase()}: ${c.name}]\n${c.content}`)
      .join('\n\n');

    // 3. Gather visual rules and prompt skeleton from template
    const visualRules = (template.visualRules as Record<string, any>) || {};
    const skeleton = template.promptSkeleton || '';

    // 4. Step 1 — Craft focused image prompt via Gemini
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
    });

    const craftedResult = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an image prompt engineer. Using the brand context and template rules below, craft a single, focused image generation prompt under 500 words. Do not include pricing, contact details, or text-heavy information — focus only on visual composition, style, and subject matter. Fill in all template placeholders with concrete values from the brand context.

TEMPLATE PROMPT SKELETON:
${skeleton}

VISUAL RULES:
${JSON.stringify(visualRules, null, 2)}

BRAND CONTEXT:
${brandContextString}

USER REQUEST: Generate an image showing: ${prompt}`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: zodToJsonSchema(CraftedPrompt) as any,
      },
    });

    let craftedPrompt = prompt;
    try {
      const parsed = JSON.parse(craftedResult.text || '{}');
      craftedPrompt = parsed.prompt || prompt;
    } catch {
      craftedPrompt = prompt;
    }

    // 5. Step 2 — Generate image via Gemini Nano Banana Pro
    // Collect resolved asset URLs and convert to base64 for reference images
    const resolvedAssets: Array<{ path: string }> =
      (template.resolvedAssets as Array<{ path: string } | null> | undefined)?.filter(
        (a): a is { path: string } => !!a && !!a.path
      ) || [];

    // Fetch reference images and convert to inline base64 parts
    const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
    for (const asset of resolvedAssets) {
      try {
        const resp = await fetch(asset.path);
        if (resp.ok) {
          const arrayBuf = await resp.arrayBuffer();
          const base64 = Buffer.from(arrayBuf).toString('base64');
          const contentType = resp.headers.get('content-type') || 'image/png';
          imageParts.push({
            inlineData: { mimeType: contentType, data: base64 },
          });
        }
      } catch {
        // Skip assets that fail to load
      }
    }

    // Build content parts: text prompt + reference images
    const contentParts: any[] = [
      { text: craftedPrompt },
      ...imageParts,
    ];

    const imageResult = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [{ role: 'user', parts: contentParts }],
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });

    // Extract the generated image from response
    const candidates = imageResult.candidates;
    if (!candidates?.[0]?.content?.parts) {
      throw new Error('Gemini image generation returned no results');
    }

    let imageBuffer: Buffer | null = null;
    for (const part of candidates[0].content.parts) {
      if (part.inlineData) {
        imageBuffer = Buffer.from(part.inlineData.data!, 'base64');
        break;
      }
    }

    if (!imageBuffer) {
      throw new Error('Gemini image generation returned no image data');
    }

    // Upload the generated image to storage
    const { path } = await this.storage.uploadFile({
      buffer: imageBuffer,
      mimetype: 'image/png',
      size: imageBuffer.length,
      path: '',
      fieldname: '',
      destination: '',
      stream: new Readable(),
      filename: '',
      originalname: '',
      encoding: '',
    });

    // Return full URL
    return path.indexOf('http') === -1
      ? process.env.FRONTEND_URL +
        '/' +
        process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY +
        path
      : path;
  }
}
