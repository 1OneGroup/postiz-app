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
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { MonthlyPlannerService } from '@gitroom/nestjs-libraries/monthly-planner/monthly-planner.service';
import { PlannerConfigService } from '@gitroom/nestjs-libraries/monthly-planner/planner-config.service';
import {
  CreatePlannerConfigDto,
  UpdatePlannerConfigDto,
} from '@gitroom/nestjs-libraries/monthly-planner/dto/planner-config.dto';
import { GenerateMonthlyPlanDto } from '@gitroom/nestjs-libraries/monthly-planner/dto/monthly-planner.dto';

@ApiTags('Monthly Planner')
@Controller('/monthly-planner')
export class MonthlyPlannerController {
  constructor(
    private _plannerService: MonthlyPlannerService,
    private _configService: PlannerConfigService,
  ) {}

  @Post('/config')
  createConfig(
    @GetOrgFromRequest() org: Organization,
    @Body() dto: CreatePlannerConfigDto,
  ) {
    return this._configService.create(org.id, dto);
  }

  @Get('/config')
  getAllConfigs(@GetOrgFromRequest() org: Organization) {
    return this._configService.findAll(org.id);
  }

  @Get('/config/:projectTag')
  getConfig(
    @GetOrgFromRequest() org: Organization,
    @Param('projectTag') projectTag: string,
  ) {
    return this._configService.findByProjectTag(org.id, projectTag);
  }

  @Put('/config/:id')
  updateConfig(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() dto: UpdatePlannerConfigDto,
  ) {
    return this._configService.update(org.id, id, dto);
  }

  @Delete('/config/:id')
  deleteConfig(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
  ) {
    return this._configService.delete(org.id, id);
  }

  @Post('/generate')
  generate(
    @GetOrgFromRequest() org: Organization,
    @Body() dto: GenerateMonthlyPlanDto,
  ) {
    return this._plannerService.generate(org.id, org, dto);
  }
}
