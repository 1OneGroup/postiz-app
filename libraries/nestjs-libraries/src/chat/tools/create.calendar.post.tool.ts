import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { ProjectPostService } from '@gitroom/nestjs-libraries/projects/project-post.service';

@Injectable()
export class CreateCalendarPostTool implements AgentToolInterface {
  constructor(private _projectPostService: ProjectPostService) {}
  name = 'createCalendarPost';

  run() {
    return createTool({
      id: 'createCalendarPost',
      description: `Create a draft post for a specific project as part of the content calendar. This saves a DRAFT post that can later be approved and scheduled to social media channels.
Use this after the user approves the proposed content calendar. Each post is tied to a project.
The content should be in HTML format with <p>, <strong>, <ul>, <li> tags.`,
      inputSchema: z.object({
        projectId: z
          .string()
          .describe(
            'The ID of the project this post belongs to. Get this from listAllProjects.'
          ),
        content: z
          .string()
          .describe(
            'The post content in HTML format. Each line wrapped in <p> tags. Allowed tags: h1, h2, h3, u, strong, li, ul, p'
          ),
        suggestedPlatform: z
          .string()
          .optional()
          .describe(
            'Suggested platform: x, linkedin, instagram, facebook, tiktok, youtube, threads, bluesky, etc.'
          ),
        suggestedDate: z
          .string()
          .optional()
          .describe('Suggested publish date in UTC ISO format'),
        title: z
          .string()
          .optional()
          .describe('A short title for the post idea'),
        notes: z
          .string()
          .optional()
          .describe(
            'Strategy notes: why this post, why this platform, why this date, what festival/event it ties to'
          ),
        image: z
          .string()
          .optional()
          .describe(
            'URL of an AI-generated image to attach. Use the generateImage tool first to get this URL.'
          ),
      }),
      outputSchema: z.object({
        output: z.object({
          id: z.string(),
          projectId: z.string(),
          status: z.string(),
          message: z.string(),
        }),
      }),
      execute: async (args) => {
        const { context, runtimeContext } = args;
        // @ts-ignore
        const orgId = JSON.parse(
          runtimeContext.get('organization') as string
        ).id;

        const post = await this._projectPostService.create(
          orgId,
          context.projectId,
          {
            content: context.content,
            suggestedPlatform: context.suggestedPlatform,
            suggestedDate: context.suggestedDate,
            title: context.title,
            notes: context.notes,
            image: context.image,
            aiGenerated: true,
          }
        );

        return {
          output: {
            id: post.id,
            projectId: context.projectId,
            status: 'DRAFT',
            message: `Draft post created successfully in the project. The user can review it in their project posts list.`,
          },
        };
      },
    });
  }
}
