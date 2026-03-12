import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { BrandContextService } from '@gitroom/nestjs-libraries/brand-context/brand-context.service';

@Injectable()
export class BrandContextTool implements AgentToolInterface {
  constructor(private _brandContextService: BrandContextService) {}
  name = 'loadBrandContext';

  run() {
    return createTool({
      id: 'loadBrandContext',
      description:
        'Load brand context, guidelines, compliance rules, and Google Drive content for this project. Use this to understand brand voice, visual rules, RERA numbers, website URLs, and any project-specific brand information. Google Drive folder contents are automatically included if linked.',
      outputSchema: z.object({
        output: z.object({
          contexts: z.array(
            z.object({
              type: z.string(),
              name: z.string(),
              content: z.string(),
              priority: z.number(),
            })
          ),
          message: z.string(),
        }),
      }),
      execute: async (args) => {
        const { runtimeContext } = args;
        // @ts-ignore
        const org = JSON.parse(runtimeContext.get('organization') as string);
        // @ts-ignore
        const projectName: string =
          runtimeContext.get('projectName' as never) || '';

        const enrichedContexts =
          await this._brandContextService.getEnrichedContextsForProject(
            org.id,
            projectName
          );

        return {
          output: {
            contexts: enrichedContexts.map((c) => ({
              type: c.type,
              name: c.name,
              content: c.content,
              priority: c.priority,
            })),
            message:
              enrichedContexts.length > 0
                ? `Found ${enrichedContexts.length} brand context(s). This includes Google Drive content if linked.`
                : 'No brand context found for this project.',
          },
        };
      },
    });
  }
}
