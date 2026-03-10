import { Global, Module } from '@nestjs/common';
import { ProjectLoadToolsService } from '@gitroom/nestjs-libraries/chat/project-agent/project-load-tools.service';
import { ProjectMastraService } from '@gitroom/nestjs-libraries/chat/project-agent/project-mastra.service';
import { projectToolList } from '@gitroom/nestjs-libraries/chat/project-agent/tools/project-tool.list';
import { ProjectModule } from '@gitroom/nestjs-libraries/projects/project.module';

@Global()
@Module({
  imports: [ProjectModule],
  providers: [ProjectMastraService, ProjectLoadToolsService, ...projectToolList],
  get exports() {
    return this.providers;
  },
})
export class ProjectChatModule {}
