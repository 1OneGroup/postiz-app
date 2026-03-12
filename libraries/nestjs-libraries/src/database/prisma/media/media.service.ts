import { HttpException, Injectable, Logger, Optional } from '@nestjs/common';
import { MediaRepository } from '@gitroom/nestjs-libraries/database/prisma/media/media.repository';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { Organization } from '@prisma/client';
import { SaveMediaInformationDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.information.dto';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import { VideoDto } from '@gitroom/nestjs-libraries/dtos/videos/video.dto';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import {
  AuthorizationActions,
  Sections,
  SubscriptionException,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { BrandContextService } from '@gitroom/nestjs-libraries/brand-context/brand-context.service';
import { ImageTemplatesService } from '@gitroom/nestjs-libraries/image-templates/image-templates.service';

@Injectable()
export class MediaService {
  private storage = UploadFactory.createStorage();
  private readonly _logger = new Logger(MediaService.name);

  constructor(
    private _mediaRepository: MediaRepository,
    private _openAi: OpenaiService,
    private _subscriptionService: SubscriptionService,
    private _videoManager: VideoManager,
    @Optional() private _brandContextService?: BrandContextService,
    @Optional() private _imageTemplatesService?: ImageTemplatesService
  ) {}

  async deleteMedia(org: string, id: string) {
    return this._mediaRepository.deleteMedia(org, id);
  }

  getMediaById(id: string) {
    return this._mediaRepository.getMediaById(id);
  }

  findByPath(path: string) {
    return this._mediaRepository.findByPath(path);
  }

  async generateImage(
    prompt: string,
    org: Organization,
    generatePromptFirst?: boolean
  ) {
    const generating = await this._subscriptionService.useCredit(
      org,
      'ai_images',
      async () => {
        if (generatePromptFirst) {
          prompt = await this._openAi.generatePromptForPicture(prompt);
          console.log('Prompt:', prompt);
        }
        return this._openAi.generateImage(prompt, !!generatePromptFirst);
      }
    );

    return generating;
  }

  async generateBrandedImage(
    prompt: string,
    org: Organization,
    projectTag?: string
  ): Promise<string | false> {
    if (!projectTag || !this._brandContextService || !this._imageTemplatesService) {
      // Fall back to standard generation when no brand context is available
      return this.generateImage(prompt, org, true);
    }

    const generating = await this._subscriptionService.useCredit(
      org,
      'ai_images',
      async () => {
        // 1. Fetch brand context
        const enrichedContexts = await this._brandContextService!.getEnrichedContextsForProject(
          org.id,
          projectTag
        );
        const brandContextString = enrichedContexts
          .map((c) => `[${c.type.toUpperCase()}: ${c.name}]\n${c.content}`)
          .join('\n\n');

        // 2. Fetch default template for this project (auto-seed if none exist)
        let template = await this._imageTemplatesService!.findDefault(org.id, projectTag);
        if (!template) {
          await this._imageTemplatesService!.seedDefaultTemplates(org.id, projectTag);
          template = await this._imageTemplatesService!.findDefault(org.id, projectTag);
        }
        const visualRules = (template?.visualRules as Record<string, any>) || {};
        const promptSkeleton = template?.promptSkeleton || '';

        // 3. Assemble reference images
        const referenceImages: Array<{ mimeType: string; base64: string }> = [];

        // Source A: Template linked assets (logo + style references)
        if (template) {
          const fullTemplate = await this._imageTemplatesService!.getTemplateWithAssetUrls(
            org.id,
            template.id
          );
          const resolvedAssets = (fullTemplate?.resolvedAssets as Array<{ path: string } | null> | undefined)
            ?.filter((a): a is { path: string } => !!a && !!a.path) || [];

          for (const asset of resolvedAssets) {
            if (referenceImages.length >= 6) break;
            try {
              const resp = await fetch(asset.path);
              if (resp.ok) {
                const buf = await resp.arrayBuffer();
                referenceImages.push({
                  mimeType: resp.headers.get('content-type') || 'image/png',
                  base64: Buffer.from(buf).toString('base64'),
                });
              }
            } catch {
              // skip
            }
          }
        }

        // Source B: Google Drive project asset images
        try {
          const driveImages = await this._brandContextService!.getProjectAssetImages(
            org.id,
            projectTag
          );
          for (const img of driveImages) {
            if (referenceImages.length >= 6) break;
            referenceImages.push({
              mimeType: img.mimeType,
              base64: img.base64,
            });
          }
        } catch {
          // Drive images are optional
        }

        // 4. Generate branded image
        if (referenceImages.length === 0 && !brandContextString) {
          // No brand data available — fall back to standard generation
          const enhanced = await this._openAi.generatePromptForPicture(prompt);
          return this._openAi.generateImage(enhanced || prompt, true);
        }

        return this._openAi.generateBrandedImage({
          prompt,
          brandContext: brandContextString,
          visualRules,
          promptSkeleton,
          referenceImages,
        });
      }
    );

    return generating;
  }

  saveFile(org: string, fileName: string, filePath: string, originalName?: string) {
    return this._mediaRepository.saveFile(org, fileName, filePath, originalName);
  }

  getMedia(org: string, page: number, folderId?: string) {
    return this._mediaRepository.getMedia(org, page, folderId);
  }

  saveMediaInformation(org: string, data: SaveMediaInformationDto) {
    return this._mediaRepository.saveMediaInformation(org, data);
  }

  getVideoOptions() {
    return this._videoManager.getAllVideos();
  }

  async generateVideoAllowed(org: Organization, type: string) {
    const video = this._videoManager.getVideoByName(type);
    if (!video) {
      throw new Error(`Video type ${type} not found`);
    }

    if (!video.trial && org.isTrailing) {
      throw new HttpException('This video is not available in trial mode', 406);
    }

    return true;
  }

  async generateVideo(org: Organization, body: VideoDto) {
    const totalCredits = await this._subscriptionService.checkCredits(
      org,
      'ai_videos'
    );

    if (totalCredits.credits <= 0) {
      throw new SubscriptionException({
        action: AuthorizationActions.Create,
        section: Sections.VIDEOS_PER_MONTH,
      });
    }

    const video = this._videoManager.getVideoByName(body.type);
    if (!video) {
      throw new Error(`Video type ${body.type} not found`);
    }

    if (!video.trial && org.isTrailing) {
      throw new HttpException('This video is not available in trial mode', 406);
    }

    console.log(body.customParams);
    await video.instance.processAndValidate(body.customParams);
    console.log('no err');

    return await this._subscriptionService.useCredit(
      org,
      'ai_videos',
      async () => {
        const loadedData = await video.instance.process(
          body.output,
          body.customParams
        );

        const file = await this.storage.uploadSimple(loadedData);
        return this.saveFile(org.id, file.split('/').pop(), file);
      }
    );
  }

  async videoFunction(identifier: string, functionName: string, body: any) {
    const video = this._videoManager.getVideoByName(identifier);
    if (!video) {
      throw new Error(`Video with identifier ${identifier} not found`);
    }

    // @ts-ignore
    const functionToCall = video.instance[functionName];
    if (
      typeof functionToCall !== 'function' ||
      this._videoManager.checkAvailableVideoFunction(functionToCall)
    ) {
      throw new HttpException(
        `Function ${functionName} not found on video instance`,
        400
      );
    }

    return functionToCall(body);
  }
}
