import { Global, Module } from '@nestjs/common';
import { LoadToolsService } from '@gitroom/nestjs-libraries/chat/load.tools.service';
import { MastraService } from '@gitroom/nestjs-libraries/chat/mastra.service';
import { toolList } from '@gitroom/nestjs-libraries/chat/tools/tool.list';
import { ProjectModule } from '@gitroom/nestjs-libraries/projects/project.module';
import { BrandContextModule } from '@gitroom/nestjs-libraries/brand-context/brand-context.module';

@Global()
@Module({
  imports: [ProjectModule, BrandContextModule],
  providers: [MastraService, LoadToolsService, ...toolList],
  get exports() {
    return this.providers;
  },
})
export class ChatModule {}
