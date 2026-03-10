import { Injectable } from '@nestjs/common';
import { ProjectPostRepository } from '@gitroom/nestjs-libraries/projects/project-post.repository';
import { CreateProjectPostDto } from '@gitroom/nestjs-libraries/projects/dto/create-project-post.dto';
import { UpdateProjectPostDto } from '@gitroom/nestjs-libraries/projects/dto/update-project-post.dto';

@Injectable()
export class ProjectPostService {
  constructor(private _repository: ProjectPostRepository) {}

  create(orgId: string, projectId: string, data: CreateProjectPostDto) {
    return this._repository.create(orgId, projectId, data);
  }

  findAllByProject(orgId: string, projectId: string) {
    return this._repository.findAllByProject(orgId, projectId);
  }

  findById(orgId: string, id: string) {
    return this._repository.findById(orgId, id);
  }

  update(orgId: string, id: string, data: UpdateProjectPostDto) {
    return this._repository.update(orgId, id, data);
  }

  approve(orgId: string, id: string) {
    return this._repository.approve(orgId, id);
  }

  delete(orgId: string, id: string) {
    return this._repository.softDelete(orgId, id);
  }
}
