import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthMiddleware } from '@gitroom/backend/services/auth/auth.middleware';
import { ProjectController } from '@gitroom/nestjs-libraries/projects/project.controller';
import { ProjectService } from '@gitroom/nestjs-libraries/projects/project.service';
import { ProjectRepository } from '@gitroom/nestjs-libraries/projects/project.repository';
import { ProjectPostService } from '@gitroom/nestjs-libraries/projects/project-post.service';
import { ProjectPostRepository } from '@gitroom/nestjs-libraries/projects/project-post.repository';

@Module({
  controllers: [ProjectController],
  providers: [
    ProjectService,
    ProjectRepository,
    ProjectPostService,
    ProjectPostRepository,
  ],
  exports: [ProjectService, ProjectPostService],
})
export class ProjectModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(ProjectController);
  }
}
