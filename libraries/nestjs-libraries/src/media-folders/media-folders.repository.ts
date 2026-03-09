import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import {
  CreateMediaFolderDto,
  UpdateMediaFolderDto,
} from '@gitroom/nestjs-libraries/media-folders/dto/media-folder.dto';

@Injectable()
export class MediaFoldersRepository {
  constructor(
    private _mediaFolder: PrismaRepository<'mediaFolder'>,
    private _media: PrismaRepository<'media'>
  ) {}

  create(orgId: string, data: CreateMediaFolderDto) {
    const { parentId, ...rest } = data;
    return this._mediaFolder.model.mediaFolder.create({
      data: {
        ...rest,
        organizationId: orgId,
        ...(parentId ? { parentId } : {}),
      },
    });
  }

  findAll(orgId: string) {
    return this._mediaFolder.model.mediaFolder.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            children: true,
            media: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  findById(orgId: string, id: string) {
    return this._mediaFolder.model.mediaFolder.findFirst({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        children: true,
        _count: {
          select: {
            media: true,
          },
        },
      },
    });
  }

  findByType(orgId: string, type: string) {
    return this._mediaFolder.model.mediaFolder.findMany({
      where: {
        organizationId: orgId,
        type,
        deletedAt: null,
      },
    });
  }

  update(orgId: string, id: string, data: UpdateMediaFolderDto) {
    return this._mediaFolder.model.mediaFolder.update({
      where: {
        id,
        organizationId: orgId,
      },
      data,
    });
  }

  softDelete(orgId: string, id: string) {
    return this._mediaFolder.model.mediaFolder.update({
      where: {
        id,
        organizationId: orgId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  moveMedia(orgId: string, mediaIds: string[], folderId: string | null) {
    return this._media.model.media.updateMany({
      where: {
        id: {
          in: mediaIds,
        },
        organizationId: orgId,
      },
      data: {
        folderId,
      },
    });
  }
}
