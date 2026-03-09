import { Injectable } from '@nestjs/common';
import { BrandContextRepository } from '@gitroom/nestjs-libraries/brand-context/brand-context.repository';
import {
  CreateBrandContextDto,
  UpdateBrandContextDto,
} from '@gitroom/nestjs-libraries/brand-context/dto/brand-context.dto';

@Injectable()
export class BrandContextService {
  constructor(private _repository: BrandContextRepository) {}

  create(orgId: string, data: CreateBrandContextDto) {
    return this._repository.create(orgId, data);
  }

  findAll(orgId: string) {
    return this._repository.findAll(orgId);
  }

  findById(orgId: string, id: string) {
    return this._repository.findById(orgId, id);
  }

  findByProjectTag(orgId: string, projectTag: string) {
    return this._repository.findByProjectTag(orgId, projectTag);
  }

  findActiveByOrg(orgId: string) {
    return this._repository.findActiveByOrg(orgId);
  }

  update(orgId: string, id: string, data: UpdateBrandContextDto) {
    return this._repository.update(orgId, id, data);
  }

  delete(orgId: string, id: string) {
    return this._repository.softDelete(orgId, id);
  }

  getDistinctProjectTags(orgId: string) {
    return this._repository.getDistinctProjectTags(orgId);
  }
}
