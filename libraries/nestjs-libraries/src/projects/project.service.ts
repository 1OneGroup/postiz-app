import { Injectable } from '@nestjs/common';
import { ProjectRepository } from '@gitroom/nestjs-libraries/projects/project.repository';
import { CreateProjectDto } from '@gitroom/nestjs-libraries/projects/dto/create-project.dto';
import { UpdateProjectDto } from '@gitroom/nestjs-libraries/projects/dto/update-project.dto';

@Injectable()
export class ProjectService {
  constructor(private _repository: ProjectRepository) {}

  create(orgId: string, data: CreateProjectDto) {
    return this._repository.create(orgId, data);
  }

  findAll(orgId: string) {
    return this._repository.findAll(orgId);
  }

  findById(orgId: string, id: string) {
    return this._repository.findById(orgId, id);
  }

  update(orgId: string, id: string, data: UpdateProjectDto) {
    return this._repository.update(orgId, id, data);
  }

  delete(orgId: string, id: string) {
    return this._repository.softDelete(orgId, id);
  }
}
