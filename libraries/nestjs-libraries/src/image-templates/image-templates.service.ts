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
