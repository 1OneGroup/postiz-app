import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { BrandContextService } from '@gitroom/nestjs-libraries/brand-context/brand-context.service';
import {
  CreateBrandContextDto,
  UpdateBrandContextDto,
} from '@gitroom/nestjs-libraries/brand-context/dto/brand-context.dto';

@ApiTags('Brand Context')
@Controller('/brand-context')
export class BrandContextController {
  private readonly _logger = new Logger(BrandContextController.name);

  constructor(private _service: BrandContextService) {}

  @Post('/')
  async create(
    @GetOrgFromRequest() org: Organization,
    @Body() dto: CreateBrandContextDto
  ) {
    this._logger.log(`POST /brand-context - orgId: ${org?.id}, dto: ${JSON.stringify(dto)}`);
    try {
      const result = await this._service.create(org.id, dto);
      this._logger.log(`Brand context created: ${result?.id}`);
      return result;
    } catch (error: any) {
      this._logger.error(`Failed to create brand context: ${error?.message}`, error?.stack);
      throw error;
    }
  }

  @Get('/')
  findAll(@GetOrgFromRequest() org: Organization) {
    return this._service.findAll(org.id);
  }

  @Get('/project-tags')
  getProjectTags(@GetOrgFromRequest() org: Organization) {
    return this._service.getDistinctProjectTags(org.id);
  }

  @Get('/by-project/:projectTag')
  findByProjectTag(
    @GetOrgFromRequest() org: Organization,
    @Param('projectTag') projectTag: string
  ) {
    return this._service.findByProjectTag(org.id, projectTag);
  }

  @Get('/:id')
  findOne(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._service.findById(org.id, id);
  }

  @Put('/:id')
  update(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() dto: UpdateBrandContextDto
  ) {
    return this._service.update(org.id, id, dto);
  }

  @Delete('/:id')
  remove(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._service.delete(org.id, id);
  }
}
