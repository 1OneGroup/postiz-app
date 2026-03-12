import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class GenerateImageTool implements AgentToolInterface {
  private storage = UploadFactory.createStorage();

  constructor(private _mediaService: MediaService) {}
  name = 'generateImageTool';

  run() {
    return createTool({
      id: 'generateImageTool',
      description: `Generate image to use in a post,
                    in case the user specified a platform that requires attachment and attachment was not provided,
                    ask if they want to generate a picture of a video.
      `,
      inputSchema: z.object({
        prompt: z.string(),
        projectTag: z.string().optional().describe('Optional project tag for branded image generation'),
      }),
      outputSchema: z.object({
        id: z.string(),
        path: z.string(),
      }),
      execute: async (args, options) => {
        const { context, runtimeContext } = args;
        checkAuth(args, options);
        // @ts-ignore
        const org = JSON.parse(runtimeContext.get('organization') as string);

        // Use branded generation when projectTag is provided
        if (context.projectTag) {
          const imageUrl = await this._mediaService.generateBrandedImage(
            context.prompt,
            org,
            context.projectTag
          );
          if (imageUrl) {
            const fileName = (imageUrl as string).split('/').pop() || 'branded-image.png';
            return this._mediaService.saveFile(org.id, fileName, imageUrl as string);
          }
        }

        // Fallback: standard generation
        const image = await this._mediaService.generateImage(
          context.prompt,
          org
        );

        const file = await this.storage.uploadSimple(
          'data:image/png;base64,' + image
        );

        return this._mediaService.saveFile(org.id, file.split('/').pop(), file);
      },
    });
  }
}
