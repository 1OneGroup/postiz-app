import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import {
  CreateBrandContextDto,
  UpdateBrandContextDto,
} from '@gitroom/nestjs-libraries/brand-context/dto/brand-context.dto';

@Injectable()
export class BrandContextRepository {
  constructor(private _brandContext: PrismaRepository<'brandContext'>) {}

  create(orgId: string, data: CreateBrandContextDto) {
    return this._brandContext.model.brandContext.create({
      data: {
        organization: {
          connect: {
            id: orgId,
          },
        },
        name: data.name,
        type: data.type,
        content: data.content,
        isActive: data.isActive,
        priority: data.priority,
        projectTag: data.projectTag,
        location: data.location,
        googleDriveFolderId: data.googleDriveFolderId,
      },
    });
  }

  findAll(orgId: string) {
    return this._brandContext.model.brandContext.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findById(orgId: string, id: string) {
    return this._brandContext.model.brandContext.findFirst({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
    });
  }

  findByProjectTag(orgId: string, projectTag: string) {
    return this._brandContext.model.brandContext.findMany({
      where: {
        organizationId: orgId,
        projectTag,
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ priority: 'desc' }],
    });
  }

  findActiveByOrg(orgId: string) {
    return this._brandContext.model.brandContext.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ priority: 'desc' }],
    });
  }

  update(orgId: string, id: string, data: UpdateBrandContextDto) {
    return this._brandContext.model.brandContext.update({
      where: {
        id,
        organizationId: orgId,
      },
      data,
    });
  }

  softDelete(orgId: string, id: string) {
    return this._brandContext.model.brandContext.update({
      where: {
        id,
        organizationId: orgId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  getDistinctProjectTags(orgId: string) {
    return this._brandContext.model.brandContext.findMany({
      where: {
        organizationId: orgId,
        projectTag: { not: null },
        deletedAt: null,
      },
      select: {
        projectTag: true,
        location: true,
      },
      distinct: ['projectTag'],
    });
  }
}
