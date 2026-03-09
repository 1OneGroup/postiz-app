import { Injectable } from '@nestjs/common';
import { MediaFoldersRepository } from '@gitroom/nestjs-libraries/media-folders/media-folders.repository';
import {
  CreateMediaFolderDto,
  MoveMediaDto,
  UpdateMediaFolderDto,
} from '@gitroom/nestjs-libraries/media-folders/dto/media-folder.dto';

@Injectable()
export class MediaFoldersService {
  constructor(private _mediaFoldersRepository: MediaFoldersRepository) {}

  create(orgId: string, data: CreateMediaFolderDto) {
    return this._mediaFoldersRepository.create(orgId, data);
  }

  findAll(orgId: string) {
    return this._mediaFoldersRepository.findAll(orgId);
  }

  findById(orgId: string, id: string) {
    return this._mediaFoldersRepository.findById(orgId, id);
  }

  findByType(orgId: string, type: string) {
    return this._mediaFoldersRepository.findByType(orgId, type);
  }

  update(orgId: string, id: string, data: UpdateMediaFolderDto) {
    return this._mediaFoldersRepository.update(orgId, id, data);
  }

  softDelete(orgId: string, id: string) {
    return this._mediaFoldersRepository.softDelete(orgId, id);
  }

  moveMedia(orgId: string, body: MoveMediaDto) {
    return this._mediaFoldersRepository.moveMedia(
      orgId,
      body.mediaIds,
      body.folderId
    );
  }
}
