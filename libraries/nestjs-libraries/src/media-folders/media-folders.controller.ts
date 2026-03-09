import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { MediaFoldersService } from '@gitroom/nestjs-libraries/media-folders/media-folders.service';
import {
  CreateMediaFolderDto,
  MoveMediaDto,
  UpdateMediaFolderDto,
} from '@gitroom/nestjs-libraries/media-folders/dto/media-folder.dto';

@ApiTags('Media Folders')
@Controller('/media-folders')
export class MediaFoldersController {
  constructor(private _mediaFoldersService: MediaFoldersService) {}

  @Post('/')
  create(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateMediaFolderDto
  ) {
    return this._mediaFoldersService.create(org.id, body);
  }

  @Get('/')
  findAll(@GetOrgFromRequest() org: Organization) {
    return this._mediaFoldersService.findAll(org.id);
  }

  @Get('/brand-assets')
  findBrandAssets(@GetOrgFromRequest() org: Organization) {
    return this._mediaFoldersService.findByType(org.id, 'brand_assets');
  }

  @Get('/:id')
  findOne(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._mediaFoldersService.findById(org.id, id);
  }

  @Put('/:id')
  update(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: UpdateMediaFolderDto
  ) {
    return this._mediaFoldersService.update(org.id, id, body);
  }

  @Delete('/:id')
  remove(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._mediaFoldersService.softDelete(org.id, id);
  }

  @Post('/move-media')
  moveMedia(
    @GetOrgFromRequest() org: Organization,
    @Body() body: MoveMediaDto
  ) {
    return this._mediaFoldersService.moveMedia(org.id, body);
  }
}
