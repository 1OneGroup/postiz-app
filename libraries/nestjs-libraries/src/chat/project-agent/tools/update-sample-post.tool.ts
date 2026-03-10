import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { ProjectPostService } from '@gitroom/nestjs-libraries/projects/project-post.service';

@Injectable()
export class UpdateSamplePostTool implements AgentToolInterface {
  constructor(private _projectPostService: ProjectPostService) {}
  name = 'updateSamplePost';

  run() {
    return createTool({
      id: 'updateSamplePost',
      description: 'Update an existing sample post based on user feedback. Use listSamplePosts first to get the post ID.',
      inputSchema: z.object({
        postId: z.string().describe('The ID of the sample post to update'),
        content: z.string().optional().describe('Updated post content in HTML format'),
        suggestedPlatform: z.string().optional().describe('Updated suggested platform'),
        suggestedDate: z.string().optional().describe('Updated suggested date in UTC ISO format'),
        title: z.string().optional().describe('Updated title'),
        notes: z.string().optional().describe('Updated strategy notes'),
      }),
      outputSchema: z.object({
        output: z.object({
          id: z.string(),
          message: z.string(),
        }),
      }),
      execute: async (args) => {
        const { context, runtimeContext } = args;
        // @ts-ignore
        const orgId = JSON.parse(runtimeContext.get('organization') as string).id;

        const updateData: any = {};
        if (context.content) updateData.content = context.content;
        if (context.suggestedPlatform) updateData.suggestedPlatform = context.suggestedPlatform;
        if (context.suggestedDate) updateData.suggestedDate = context.suggestedDate;
        if (context.title) updateData.title = context.title;
        if (context.notes) updateData.notes = context.notes;

        const post = await this._projectPostService.update(
          orgId,
          context.postId,
          updateData
        );

        return {
          output: {
            id: post.id,
            message: 'Sample post updated successfully!',
          },
        };
      },
    });
  }
}
