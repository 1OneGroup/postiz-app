import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectPostRepository } from '@gitroom/nestjs-libraries/projects/project-post.repository';
import { CreateProjectPostDto } from '@gitroom/nestjs-libraries/projects/dto/create-project-post.dto';
import { UpdateProjectPostDto } from '@gitroom/nestjs-libraries/projects/dto/update-project-post.dto';
import { ScheduleProjectPostDto } from '@gitroom/nestjs-libraries/projects/dto/schedule-project-post.dto';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';

@Injectable()
export class ProjectPostService {
  constructor(
    private _repository: ProjectPostRepository,
    private _postsService: PostsService,
    private _mediaService: MediaService
  ) {}

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

  async scheduleToCalendar(
    orgId: string,
    postId: string,
    dto: ScheduleProjectPostDto
  ) {
    const projectPost = await this._repository.findById(orgId, postId);
    if (!projectPost) {
      throw new NotFoundException('Project post not found');
    }
    if (projectPost.status !== 'APPROVED') {
      throw new BadRequestException('Only approved posts can be scheduled');
    }

    const images: { path: string; id: string }[] = [];
    if (projectPost.image) {
      const media = await this._mediaService.findByPath(projectPost.image);
      if (media) {
        images.push({ path: media.path, id: media.id });
      }
    }

    const rawBody = {
      type: 'schedule' as const,
      date: dto.date,
      shortLink: false,
      tags: [] as { value: string; label: string }[],
      posts: [
        {
          integration: { id: dto.integrationId },
          value: [
            {
              content: projectPost.content,
              image: images,
            },
          ],
          settings: {},
        },
      ],
    };

    const body = await this._postsService.mapTypeToPost(rawBody as any, orgId);
    const result = await this._postsService.createPost(orgId, body);

    await this._repository.markAsConverted(orgId, postId);

    return result;
  }
}
