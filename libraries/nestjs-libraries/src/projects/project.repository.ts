import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from '@gitroom/nestjs-libraries/projects/dto/create-project.dto';
import { UpdateProjectDto } from '@gitroom/nestjs-libraries/projects/dto/update-project.dto';

@Injectable()
export class ProjectRepository {
  constructor(private _project: PrismaRepository<'project'>) {}

  create(orgId: string, data: CreateProjectDto) {
    return this._project.model.project.create({
      data: {
        organization: {
          connect: { id: orgId },
        },
        name: data.name,
        description: data.description,
        color: data.color,
      },
    });
  }

  findAll(orgId: string) {
    return this._project.model.project.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { posts: { where: { deletedAt: null } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(orgId: string, id: string) {
    return this._project.model.project.findFirst({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
    });
  }

  update(orgId: string, id: string, data: UpdateProjectDto) {
    return this._project.model.project.update({
      where: {
        id,
        organizationId: orgId,
      },
      data,
    });
  }

  softDelete(orgId: string, id: string) {
    return this._project.model.project.update({
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
