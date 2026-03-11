import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class WebSearchTool implements AgentToolInterface {
  name = 'webSearch';

  run() {
    return createTool({
      id: 'webSearch',
      description:
        'Search the web for real-time information using Google Search. Use this to research topics, find current news, get details about businesses, products, events, or any other information that would help create better, more informed posts for the project.',
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            'The search query. Be specific and descriptive for better results.'
          ),
      }),
      outputSchema: z.object({
        output: z.object({
          summary: z.string(),
          sources: z.array(
            z.object({
              title: z.string(),
              url: z.string(),
            })
          ),
          searchQueries: z.array(z.string()),
        }),
      }),
      execute: async (args) => {
        const { context } = args;

        const apiKey = process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
          return {
            output: {
              summary: 'Web search is not available: GEMINI_API_KEY is not configured.',
              sources: [] as { title: string; url: string }[],
              searchQueries: [] as string[],
            },
          };
        }

        const ai = new GoogleGenAI({ apiKey });

        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: context.query,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const groundingMeta = (result as any).candidates?.[0]
          ?.groundingMetadata;

        const sources: { title: string; url: string }[] = (
          groundingMeta?.groundingChunks || []
        )
          .filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({
            title: chunk.web.title || '',
            url: chunk.web.uri || '',
          }));

        const searchQueries: string[] =
          groundingMeta?.webSearchQueries || [];

        const summary = result.text || 'No results found.';

        return {
          output: {
            summary,
            sources,
            searchQueries,
          },
        };
      },
    });
  }
}
