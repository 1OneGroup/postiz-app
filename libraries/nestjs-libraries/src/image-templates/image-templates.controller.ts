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
import { ImageTemplatesService } from '@gitroom/nestjs-libraries/image-templates/image-templates.service';
import {
  CreateImageTemplateDto,
  UpdateImageTemplateDto,
} from '@gitroom/nestjs-libraries/image-templates/dto/image-template.dto';

@ApiTags('Image Templates')
@Controller('/image-templates')
export class ImageTemplatesController {
  constructor(private _imageTemplatesService: ImageTemplatesService) {}

  @Post('/')
  create(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateImageTemplateDto
  ) {
    return this._imageTemplatesService.create(org.id, body);
  }

  @Get('/')
  findAll(@GetOrgFromRequest() org: Organization) {
    return this._imageTemplatesService.findAll(org.id);
  }

  @Get('/by-project/:projectTag')
  findByProjectTag(
    @GetOrgFromRequest() org: Organization,
    @Param('projectTag') projectTag: string
  ) {
    return this._imageTemplatesService.findByProjectTag(org.id, projectTag);
  }

  @Get('/:id')
  findOne(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._imageTemplatesService.findById(org.id, id);
  }

  @Get('/:id/with-assets')
  getWithAssets(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._imageTemplatesService.getTemplateWithAssetUrls(org.id, id);
  }

  @Put('/:id')
  update(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: UpdateImageTemplateDto
  ) {
    return this._imageTemplatesService.update(org.id, id, body);
  }

  @Delete('/:id')
  remove(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._imageTemplatesService.softDelete(org.id, id);
  }
}
