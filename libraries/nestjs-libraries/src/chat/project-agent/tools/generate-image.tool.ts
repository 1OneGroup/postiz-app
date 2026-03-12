import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';

@Injectable()
export class GenerateImageTool implements AgentToolInterface {
  constructor(
    private _openaiService: OpenaiService,
    private _mediaService: MediaService
  ) {}
  name = 'generateImage';

  run() {
    return createTool({
      id: 'generateImage',
      description:
        'Generate an AI image based on a text description. Returns an image URL that can be used when creating or updating sample posts. The image is also saved to the Media library. Use this when the user wants visual content for their posts.',
      inputSchema: z.object({
        description: z
          .string()
          .describe(
            'A detailed description of the image to generate. Be specific about style, colors, composition, etc.'
          ),
      }),
      outputSchema: z.object({
        output: z.object({
          imageUrl: z.string(),
          mediaId: z.string(),
          message: z.string(),
        }),
      }),
      execute: async (args) => {
        const { context, runtimeContext } = args;
        // @ts-ignore
        const org = JSON.parse(runtimeContext.get('organization') as string);
        const orgId = org.id;
        const projectName: string = runtimeContext.get('projectName' as never) || 'AI';

        // Try branded generation using projectName as projectTag
        const brandedUrl = await this._mediaService.generateBrandedImage(
          context.description,
          org,
          projectName
        );

        if (brandedUrl) {
          const fileName = `ai-${projectName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
          const originalName = `[${projectName}] ${context.description.substring(0, 80)}`;
          const media = await this._mediaService.saveFile(orgId, fileName, brandedUrl as string, originalName);

          return {
            output: {
              imageUrl: brandedUrl as string,
              mediaId: media.id,
              message: `Branded image generated and saved to Media library as "${originalName}". Use the imageUrl when calling createSamplePost or updateSamplePost.`,
            },
          };
        }

        // Fallback: standard generation without brand context
        const enhancedPrompt =
          await this._openaiService.generatePromptForPicture(context.description);
        const imageUrl = await this._openaiService.generateImage(
          enhancedPrompt || context.description,
          true
        );

        const fileName = `ai-${projectName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
        const originalName = `[${projectName}] ${context.description.substring(0, 80)}`;
        const media = await this._mediaService.saveFile(orgId, fileName, imageUrl, originalName);

        return {
          output: {
            imageUrl,
            mediaId: media.id,
            message: `Image generated and saved to Media library as "${originalName}". Use the imageUrl when calling createSamplePost or updateSamplePost.`,
          },
        };
      },
    });
  }
}
