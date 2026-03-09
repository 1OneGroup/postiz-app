import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import {
  CreateImageTemplateDto,
  UpdateImageTemplateDto,
} from '@gitroom/nestjs-libraries/image-templates/dto/image-template.dto';

@Injectable()
export class ImageTemplatesRepository {
  constructor(private _imageTemplate: PrismaRepository<'imageTemplate'>) {}

  create(orgId: string, data: CreateImageTemplateDto) {
    return this._imageTemplate.model.imageTemplate.create({
      data: {
        organization: {
          connect: {
            id: orgId,
          },
        },
        name: data.name,
        projectTag: data.projectTag ?? null,
        visualRules: data.visualRules ?? undefined,
        promptSkeleton: data.promptSkeleton,
        linkedAssetIds: data.linkedAssetIds ?? undefined,
        isDefault: data.isDefault ?? false,
      },
    });
  }

  findAll(orgId: string) {
    return this._imageTemplate.model.imageTemplate.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findById(orgId: string, id: string) {
    return this._imageTemplate.model.imageTemplate.findFirst({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
    });
  }

  findByProjectTag(orgId: string, projectTag: string) {
    return this._imageTemplate.model.imageTemplate.findMany({
      where: {
        organizationId: orgId,
        projectTag,
        deletedAt: null,
      },
    });
  }

  findDefault(orgId: string, projectTag: string) {
    return this._imageTemplate.model.imageTemplate.findFirst({
      where: {
        organizationId: orgId,
        projectTag,
        isDefault: true,
        deletedAt: null,
      },
    });
  }

  update(orgId: string, id: string, data: UpdateImageTemplateDto) {
    return this._imageTemplate.model.imageTemplate.update({
      where: {
        id,
        organizationId: orgId,
      },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.projectTag !== undefined
          ? { projectTag: data.projectTag }
          : {}),
        ...(data.visualRules !== undefined
          ? { visualRules: data.visualRules }
          : {}),
        ...(data.promptSkeleton !== undefined
          ? { promptSkeleton: data.promptSkeleton }
          : {}),
        ...(data.linkedAssetIds !== undefined
          ? { linkedAssetIds: data.linkedAssetIds }
          : {}),
        ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
      },
    });
  }

  softDelete(orgId: string, id: string) {
    return this._imageTemplate.model.imageTemplate.update({
      where: {
        id,
        organizationId: orgId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
