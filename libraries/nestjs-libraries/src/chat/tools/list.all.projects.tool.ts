import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { ProjectService } from '@gitroom/nestjs-libraries/projects/project.service';

@Injectable()
export class ListAllProjectsTool implements AgentToolInterface {
  constructor(private _projectService: ProjectService) {}
  name = 'listAllProjects';

  run() {
    return createTool({
      id: 'listAllProjects',
      description:
        'List all projects in the organization. Use this to discover all projects before creating a content calendar. Each project represents a brand, product, or initiative that needs social media content.',
      outputSchema: z.object({
        output: z.object({
          projects: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              description: z.string().nullable(),
              color: z.string().nullable(),
            })
          ),
          message: z.string(),
        }),
      }),
      execute: async (args) => {
        const { runtimeContext } = args;
        // @ts-ignore
        const orgId = JSON.parse(
          runtimeContext.get('organization') as string
        ).id;

        const projects = await this._projectService.findAll(orgId);

        return {
          output: {
            projects: projects.map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.description || null,
              color: p.color || null,
            })),
            message:
              projects.length > 0
                ? `Found ${projects.length} project(s).`
                : 'No projects found. The user should create projects first in the Projects tab.',
          },
        };
      },
    });
  }
}
