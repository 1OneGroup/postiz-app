import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import {
  CreatePlannerConfigDto,
  UpdatePlannerConfigDto,
} from '@gitroom/nestjs-libraries/monthly-planner/dto/planner-config.dto';

@Injectable()
export class PlannerConfigRepository {
  constructor(private _plannerConfig: PrismaRepository<'plannerConfig'>) {}

  create(orgId: string, data: CreatePlannerConfigDto) {
    return this._plannerConfig.model.plannerConfig.create({
      data: {
        organization: {
          connect: {
            id: orgId,
          },
        },
        projectTag: data.projectTag,
        postsPerWeek: data.postsPerWeek ?? 3,
        preferredCategories: data.preferredCategories ?? undefined,
        contentGuidelines: data.contentGuidelines,
      },
    });
  }

  findByProjectTag(orgId: string, projectTag: string) {
    return this._plannerConfig.model.plannerConfig.findFirst({
      where: {
        organizationId: orgId,
        projectTag,
        deletedAt: null,
      },
    });
  }

  findAll(orgId: string) {
    return this._plannerConfig.model.plannerConfig.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
    });
  }

  update(orgId: string, id: string, data: UpdatePlannerConfigDto) {
    return this._plannerConfig.model.plannerConfig.update({
      where: {
        id,
        organizationId: orgId,
      },
      data,
    });
  }

  softDelete(orgId: string, id: string) {
    return this._plannerConfig.model.plannerConfig.update({
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
