import { Injectable } from '@nestjs/common';
import { ImageTemplatesRepository } from '@gitroom/nestjs-libraries/image-templates/image-templates.repository';
import { MediaRepository } from '@gitroom/nestjs-libraries/database/prisma/media/media.repository';
import {
  CreateImageTemplateDto,
  UpdateImageTemplateDto,
} from '@gitroom/nestjs-libraries/image-templates/dto/image-template.dto';

@Injectable()
export class ImageTemplatesService {
  constructor(
    private _repository: ImageTemplatesRepository,
    private _mediaRepository: MediaRepository
  ) {}

  create(orgId: string, data: CreateImageTemplateDto) {
    return this._repository.create(orgId, data);
  }

  findAll(orgId: string) {
    return this._repository.findAll(orgId);
  }

  findById(orgId: string, id: string) {
    return this._repository.findById(orgId, id);
  }

  findByProjectTag(orgId: string, projectTag: string) {
    return this._repository.findByProjectTag(orgId, projectTag);
  }

  findDefault(orgId: string, projectTag: string) {
    return this._repository.findDefault(orgId, projectTag);
  }

  update(orgId: string, id: string, data: UpdateImageTemplateDto) {
    return this._repository.update(orgId, id, data);
  }

  softDelete(orgId: string, id: string) {
    return this._repository.softDelete(orgId, id);
  }

  async seedDefaultTemplates(orgId: string, projectTag: string) {
    const existing = await this._repository.findByProjectTag(orgId, projectTag);
    if (existing.length > 0) {
      return existing;
    }

    const templates = [
      {
        name: 'Construction Update',
        promptSkeleton:
          'A branded social media creative showing real construction progress. Background: photorealistic construction site with workers, cranes, or building structure. Headline: bold motivational text about strength and progress. Subtitle: project milestone or update detail.',
        visualRules: {
          layout: {
            logoPosition: 'top-left',
            reraPosition: 'top-right',
            headlinePosition: 'bottom',
            subtitlePosition: 'below-headline',
          },
          typography: {
            headlineStyle: 'bold serif, gold or white on dark overlay',
            subtitleStyle: 'clean sans-serif, lighter weight',
          },
          colors: { primary: 'deep navy', accent: 'gold', text: 'white' },
          backgroundStyle: 'real construction photography with dark gradient overlay at bottom',
        },
        isDefault: true,
      },
      {
        name: 'Project Showcase',
        promptSkeleton:
          'A branded social media creative featuring the building exterior. Background: 3D architectural render of building facade, night or twilight lighting with warm glow. Headline: project name or unique selling point. Subtitle: key feature like floor count, unit type, or location.',
        visualRules: {
          layout: {
            logoPosition: 'top-left',
            reraPosition: 'top-right',
            headlinePosition: 'bottom',
            subtitlePosition: 'below-headline',
          },
          typography: {
            headlineStyle: 'bold serif, cream or gold, large size',
            subtitleStyle: 'sans-serif, white, medium weight',
          },
          colors: { primary: 'navy blue', accent: 'gold/cream', text: 'white' },
          backgroundStyle: '3D exterior architectural render, luxury aesthetic, night/twilight scene',
        },
        isDefault: false,
      },
      {
        name: 'Brand Awareness',
        promptSkeleton:
          'A branded social media creative for brand visibility. Background: minimal gradient or subtle geometric pattern. Logo prominently placed. Headline: call-to-action text. Include website URL prominently.',
        visualRules: {
          layout: {
            logoPosition: 'center',
            reraPosition: 'top-right',
            headlinePosition: 'center-bottom',
            subtitlePosition: 'below-headline',
          },
          typography: {
            headlineStyle: 'bold display font, white or gold',
            subtitleStyle: 'clean sans-serif with website URL',
          },
          colors: { primary: 'deep navy', accent: 'gold', text: 'white' },
          backgroundStyle: 'minimal gradient, deep navy to dark blue, subtle geometric pattern',
        },
        isDefault: false,
      },
      {
        name: 'Amenity Highlight',
        promptSkeleton:
          'A branded social media creative highlighting a specific amenity or feature. Background: 3D render of the amenity (terrace, pool, garden, gym). Headline: feature name or lifestyle benefit. Subtitle: descriptive detail about the amenity.',
        visualRules: {
          layout: {
            logoPosition: 'top-left',
            reraPosition: 'top-right',
            headlinePosition: 'bottom',
            subtitlePosition: 'below-headline',
          },
          typography: {
            headlineStyle: 'bold serif, white or cream',
            subtitleStyle: 'sans-serif, lighter weight, white',
          },
          colors: { primary: 'navy', accent: 'gold/cream', text: 'white' },
          backgroundStyle: '3D render of amenity, luxury lifestyle aesthetic, warm lighting',
        },
        isDefault: false,
      },
      {
        name: 'Interior Showcase',
        promptSkeleton:
          'A branded social media creative showcasing interior design. Background: 3D interior render of living room, bedroom, or kitchen with luxury finishes. Headline: comfort or space-focused messaging. Subtitle: room type or design detail.',
        visualRules: {
          layout: {
            logoPosition: 'top-left',
            reraPosition: 'top-right',
            headlinePosition: 'bottom',
            subtitlePosition: 'below-headline',
          },
          typography: {
            headlineStyle: 'bold serif, white or cream on dark overlay',
            subtitleStyle: 'sans-serif, lighter, white',
          },
          colors: { primary: 'warm navy', accent: 'gold/cream', text: 'white' },
          backgroundStyle: '3D luxury interior render, warm lighting, modern finishes',
        },
        isDefault: false,
      },
      {
        name: 'Educational / Engagement',
        promptSkeleton:
          'A branded social media creative for educational or engagement content. Background: building render with dark overlay for text readability. Headline: question or educational statement to engage audience. Subtitle: brief answer or call to learn more.',
        visualRules: {
          layout: {
            logoPosition: 'top-left',
            reraPosition: 'top-right',
            headlinePosition: 'center',
            subtitlePosition: 'below-headline',
          },
          typography: {
            headlineStyle: 'bold serif, gold or white, large size',
            subtitleStyle: 'sans-serif, white, medium',
          },
          colors: { primary: 'dark navy', accent: 'gold', text: 'white' },
          backgroundStyle: 'architectural render with heavy dark overlay, text-focused composition',
        },
        isDefault: false,
      },
    ];

    const created = [];
    for (const tpl of templates) {
      const result = await this._repository.create(orgId, {
        name: tpl.name,
        projectTag,
        promptSkeleton: tpl.promptSkeleton,
        visualRules: tpl.visualRules,
        isDefault: tpl.isDefault,
      });
      created.push(result);
    }
    return created;
  }

  async getTemplateWithAssetUrls(orgId: string, templateId: string) {
    const template = await this._repository.findById(orgId, templateId);
    if (!template) {
      return null;
    }

    const linkedAssetIds = template.linkedAssetIds as string[] | null;
    if (!linkedAssetIds || linkedAssetIds.length === 0) {
      return { ...template, resolvedAssets: [] };
    }

    const resolvedAssets = await Promise.all(
      linkedAssetIds.map((mediaId) =>
        this._mediaRepository.getMediaById(mediaId)
      )
    );

    return {
      ...template,
      resolvedAssets: resolvedAssets.filter(Boolean),
    };
  }
}
