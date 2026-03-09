import { Injectable } from '@nestjs/common';
import { PlannerConfigRepository } from '@gitroom/nestjs-libraries/monthly-planner/planner-config.repository';
import {
  CreatePlannerConfigDto,
  UpdatePlannerConfigDto,
} from '@gitroom/nestjs-libraries/monthly-planner/dto/planner-config.dto';

@Injectable()
export class PlannerConfigService {
  constructor(private _repository: PlannerConfigRepository) {}

  create(orgId: string, data: CreatePlannerConfigDto) {
    return this._repository.create(orgId, data);
  }

  findByProjectTag(orgId: string, projectTag: string) {
    return this._repository.findByProjectTag(orgId, projectTag);
  }

  findAll(orgId: string) {
    return this._repository.findAll(orgId);
  }

  update(orgId: string, id: string, data: UpdatePlannerConfigDto) {
    return this._repository.update(orgId, id, data);
  }

  delete(orgId: string, id: string) {
    return this._repository.softDelete(orgId, id);
  }
}
