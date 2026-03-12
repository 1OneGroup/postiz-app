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

const MAX_REFERENCE_IMAGES = 6;

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
  title: 'Branded Image (Nano Banana Pro)',
  description:
    'Generate branded images using project templates, brand context, and Google Drive project assets. Select a template, provide a brief description, and get a professionally branded social media creative with accurate text, logo, and layout.',
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

    // 2. Fetch enriched brand context (with Google Drive text content)
    const enrichedContexts = await this._brandContextService.getEnrichedContextsForProject(
      organizationId,
      projectTag
    );
    const brandContextString = enrichedContexts
      .map((c) => `[${c.type.toUpperCase()}: ${c.name}]\n${c.content}`)
      .join('\n\n');

    // 3. Fetch project asset images from Google Drive (facade renders, site photos, old media)
    const driveImages = await this._brandContextService.getProjectAssetImages(
      organizationId,
      projectTag
    );

    // 4. Gather visual rules and prompt skeleton from template
    const visualRules = (template.visualRules as Record<string, any>) || {};
    const skeleton = template.promptSkeleton || '';

    // 5. Step 1 — Craft focused branded image prompt via Gemini
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
    });

    // Build reference image labels for the prompt
    const resolvedAssets: Array<{ path: string }> =
      (template.resolvedAssets as Array<{ path: string } | null> | undefined)?.filter(
        (a): a is { path: string } => !!a && !!a.path
      ) || [];

    const refImageLabels: string[] = [];
    let refIdx = 1;
    if (resolvedAssets.length > 0) {
      refImageLabels.push(
        `Image ${refIdx} is the brand logo — reproduce it EXACTLY in the top-left corner of the output.`
      );
      refIdx++;
      for (let i = 1; i < resolvedAssets.length; i++) {
        refImageLabels.push(
          `Image ${refIdx} is a style reference — match this layout, typography style, and visual composition.`
        );
        refIdx++;
      }
    }
    for (const driveImg of driveImages) {
      if (refIdx > MAX_REFERENCE_IMAGES) break;
      refImageLabels.push(
        `Image ${refIdx} is a project asset (${driveImg.name}) — use as visual reference for the building/scene style.`
      );
      refIdx++;
    }

    const craftedResult = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert social media graphic designer for a real estate brand. Using the brand context, template rules, and reference image descriptions below, craft a single, detailed image generation prompt under 600 words.

YOUR OUTPUT MUST describe a complete branded social media creative with these elements:
1. BACKGROUND SCENE: A photorealistic or 3D-rendered scene based on the user request and project context.
2. BRAND LOGO: The brand logo placed in the top-left corner (reproduced from reference image 1).
3. HEADLINE TEXT: A bold, large serif/display font headline at the bottom of the image. Gold, cream, or white color.
4. SUBTITLE TEXT: A smaller subtitle line below the headline in lighter weight font.
5. COMPLIANCE TEXT: RERA registration number in the top-right corner (small, legible).
6. WEBSITE URL: If available from brand context, include in the top-right area.
7. ASPECT RATIO: Square 1:1 format for social media.

Focus on visual composition, text placement, typography, and brand consistency. Do NOT include pricing or contact details in the image.

REFERENCE IMAGES PROVIDED:
${refImageLabels.join('\n')}

TEMPLATE PROMPT SKELETON:
${skeleton}

VISUAL RULES:
${JSON.stringify(visualRules, null, 2)}

BRAND CONTEXT:
${brandContextString}

USER REQUEST: Generate a branded social media creative showing: ${prompt}`,
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

    // 6. Step 2 — Assemble reference images from 3 sources (max 6 total)
    const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];

    // Source 1: Template linked assets (logo first, then style references)
    for (const asset of resolvedAssets) {
      if (imageParts.length >= MAX_REFERENCE_IMAGES) break;
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

    // Source 2: Google Drive project assets (facade renders, site photos, old media)
    for (const driveImg of driveImages) {
      if (imageParts.length >= MAX_REFERENCE_IMAGES) break;
      imageParts.push({
        inlineData: { mimeType: driveImg.mimeType, data: driveImg.base64 },
      });
    }

    // 7. Generate image with Nano Banana Pro (Gemini 3 Pro Image)
    const contentParts: any[] = [
      { text: craftedPrompt },
      ...imageParts,
    ];

    const imageResult = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: [{ role: 'user', parts: contentParts }],
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: {
          aspectRatio: output === 'vertical' ? '3:4' : '1:1',
          imageSize: '2K',
        },
      },
    });

    // Extract the generated image from response
    const candidates = imageResult.candidates;
    if (!candidates?.[0]?.content?.parts) {
      throw new Error('Nano Banana Pro image generation returned no results');
    }

    let imageBuffer: Buffer | null = null;
    for (const part of candidates[0].content.parts) {
      if (part.inlineData) {
        imageBuffer = Buffer.from(part.inlineData.data!, 'base64');
        break;
      }
    }

    if (!imageBuffer) {
      throw new Error('Nano Banana Pro image generation returned no image data');
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
