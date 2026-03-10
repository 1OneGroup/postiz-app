import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { ProjectService } from '@gitroom/nestjs-libraries/projects/project.service';

@Injectable()
export class ProjectContextTool implements AgentToolInterface {
  constructor(private _projectService: ProjectService) {}
  name = 'projectContext';

  run() {
    return createTool({
      id: 'projectContext',
      description: 'Load the current project details (name, description) to understand context',
      outputSchema: z.object({
        output: z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().nullable(),
          color: z.string().nullable(),
        }),
      }),
      execute: async (args) => {
        const { runtimeContext } = args;
        // @ts-ignore
        const projectId = runtimeContext.get('projectId') as string;
        // @ts-ignore
        const orgId = JSON.parse(runtimeContext.get('organization') as string).id;

        const project = await this._projectService.findById(orgId, projectId);
        return {
          output: {
            id: project?.id || '',
            name: project?.name || '',
            description: project?.description || null,
            color: project?.color || null,
          },
        };
      },
    });
  }
}
