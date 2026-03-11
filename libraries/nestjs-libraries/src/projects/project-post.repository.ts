import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { CreateProjectPostDto } from '@gitroom/nestjs-libraries/projects/dto/create-project-post.dto';
import { UpdateProjectPostDto } from '@gitroom/nestjs-libraries/projects/dto/update-project-post.dto';

@Injectable()
export class ProjectPostRepository {
  constructor(private _projectPost: PrismaRepository<'projectPost'>) {}

  create(orgId: string, projectId: string, data: CreateProjectPostDto) {
    return this._projectPost.model.projectPost.create({
      data: {
        organization: {
          connect: { id: orgId },
        },
        project: {
          connect: { id: projectId },
        },
        content: data.content,
        suggestedPlatform: data.suggestedPlatform,
        suggestedDate: data.suggestedDate ? new Date(data.suggestedDate) : undefined,
        title: data.title,
        image: data.image,
        aiGenerated: data.aiGenerated ?? false,
        notes: data.notes,
      },
    });
  }

  findAllByProject(orgId: string, projectId: string) {
    return this._projectPost.model.projectPost.findMany({
      where: {
        organizationId: orgId,
        projectId,
        deletedAt: null,
      },
      orderBy: [{ suggestedDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findById(orgId: string, id: string) {
    return this._projectPost.model.projectPost.findFirst({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
    });
  }

  update(orgId: string, id: string, data: UpdateProjectPostDto) {
    const updateData: any = { ...data };
    if (data.suggestedDate) {
      updateData.suggestedDate = new Date(data.suggestedDate);
    }
    return this._projectPost.model.projectPost.update({
      where: {
        id,
        organizationId: orgId,
      },
      data: updateData,
    });
  }

  approve(orgId: string, id: string) {
    return this._projectPost.model.projectPost.update({
      where: {
        id,
        organizationId: orgId,
      },
      data: {
        status: 'APPROVED',
      },
    });
  }

  markAsConverted(orgId: string, id: string) {
    return this._projectPost.model.projectPost.update({
      where: {
        id,
        organizationId: orgId,
      },
      data: {
        status: 'CONVERTED',
      },
    });
  }

  softDelete(orgId: string, id: string) {
    return this._projectPost.model.projectPost.update({
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
