import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { ProjectPostService } from '@gitroom/nestjs-libraries/projects/project-post.service';

@Injectable()
export class ListSamplePostsTool implements AgentToolInterface {
  constructor(private _projectPostService: ProjectPostService) {}
  name = 'listSamplePosts';

  run() {
    return createTool({
      id: 'listSamplePosts',
      description: 'List all existing sample posts for the current project. Use this to see what has already been suggested and avoid duplicates.',
      outputSchema: z.object({
        output: z.array(
          z.object({
            id: z.string(),
            content: z.string(),
            suggestedPlatform: z.string().nullable(),
            suggestedDate: z.string().nullable(),
            title: z.string().nullable(),
            status: z.string(),
            notes: z.string().nullable(),
          })
        ),
      }),
      execute: async (args) => {
        const { runtimeContext } = args;
        // @ts-ignore
        const projectId = runtimeContext.get('projectId') as string;
        // @ts-ignore
        const orgId = JSON.parse(runtimeContext.get('organization') as string).id;

        const posts = await this._projectPostService.findAllByProject(orgId, projectId);

        return {
          output: posts.map((p) => ({
            id: p.id,
            content: p.content,
            suggestedPlatform: p.suggestedPlatform,
            suggestedDate: p.suggestedDate?.toISOString() || null,
            title: p.title,
            status: p.status,
            notes: p.notes,
          })),
        };
      },
    });
  }
}
