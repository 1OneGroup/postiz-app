import { Global, Module } from '@nestjs/common';
import { ProjectLoadToolsService } from '@gitroom/nestjs-libraries/chat/project-agent/project-load-tools.service';
import { ProjectMastraService } from '@gitroom/nestjs-libraries/chat/project-agent/project-mastra.service';
import { projectToolList } from '@gitroom/nestjs-libraries/chat/project-agent/tools/project-tool.list';
import { ProjectModule } from '@gitroom/nestjs-libraries/projects/project.module';
import { BrandContextModule } from '@gitroom/nestjs-libraries/brand-context/brand-context.module';
import { GoogleDriveModule } from '@gitroom/nestjs-libraries/google-drive/google-drive.module';

@Global()
@Module({
  imports: [ProjectModule, BrandContextModule, GoogleDriveModule],
  providers: [ProjectMastraService, ProjectLoadToolsService, ...projectToolList],
  get exports() {
    return this.providers;
  },
})
export class ProjectChatModule {}
