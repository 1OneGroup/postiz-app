import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { ProjectPostService } from '@gitroom/nestjs-libraries/projects/project-post.service';

@Injectable()
export class CreateSamplePostTool implements AgentToolInterface {
  constructor(private _projectPostService: ProjectPostService) {}
  name = 'createSamplePost';

  run() {
    return createTool({
      id: 'createSamplePost',
      description: `Create a sample/draft post for the project. This does NOT publish anything - it saves a draft idea with suggested platform and date.
Use this when the user confirms they want to save a post idea.
The content should be in HTML format with <p>, <strong>, <ul>, <li> tags.`,
      inputSchema: z.object({
        content: z.string().describe('The post content in HTML format. Each line wrapped in <p> tags. Allowed tags: h1, h2, h3, u, strong, li, ul, p'),
        suggestedPlatform: z.string().optional().describe('Suggested platform: x, linkedin, instagram, facebook, tiktok, youtube, threads, bluesky, etc.'),
        suggestedDate: z.string().optional().describe('Suggested publish date in UTC ISO format'),
        title: z.string().optional().describe('Optional title for the post idea'),
        notes: z.string().optional().describe('Your reasoning and strategy notes about why this post idea works'),
        image: z.string().optional().describe('URL of an AI-generated image to attach to the post. Use the generateImage tool first to get this URL.'),
      }),
      outputSchema: z.object({
        output: z.object({
          id: z.string(),
          status: z.string(),
          message: z.string(),
        }),
      }),
      execute: async (args) => {
        const { context, runtimeContext } = args;
        // @ts-ignore
        const projectId = runtimeContext.get('projectId') as string;
        // @ts-ignore
        const orgId = JSON.parse(runtimeContext.get('organization') as string).id;

        const post = await this._projectPostService.create(orgId, projectId, {
          content: context.content,
          suggestedPlatform: context.suggestedPlatform,
          suggestedDate: context.suggestedDate,
          title: context.title,
          notes: context.notes,
          image: context.image,
          aiGenerated: true,
        });

        return {
          output: {
            id: post.id,
            status: 'DRAFT',
            message: `Sample post created successfully! It's saved as a draft in the project. The user can view it in their project posts list.`,
          },
        };
      },
    });
  }
}
