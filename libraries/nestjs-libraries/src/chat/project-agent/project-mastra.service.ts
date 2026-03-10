import { Mastra } from '@mastra/core/mastra';
import { ConsoleLogger } from '@mastra/core/logger';
import { pStore } from '@gitroom/nestjs-libraries/chat/mastra.store';
import { Injectable } from '@nestjs/common';
import { ProjectLoadToolsService } from '@gitroom/nestjs-libraries/chat/project-agent/project-load-tools.service';

@Injectable()
export class ProjectMastraService {
  static mastra: Mastra;
  constructor(private _loadToolsService: ProjectLoadToolsService) {}

  async mastra() {
    ProjectMastraService.mastra =
      ProjectMastraService.mastra ||
      new Mastra({
        storage: pStore,
        agents: {
          projectAgent: await this._loadToolsService.agent(),
        },
        logger: new ConsoleLogger({
          level: 'info',
        }),
      });

    return ProjectMastraService.mastra;
  }
}
