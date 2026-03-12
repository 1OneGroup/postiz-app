import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { GoogleDriveService } from '@gitroom/nestjs-libraries/google-drive/google-drive.service';

@Injectable()
export class ReadDriveFileTool implements AgentToolInterface {
  constructor(private _googleDriveService: GoogleDriveService) {}
  name = 'readDriveFile';

  run() {
    return createTool({
      id: 'readDriveFile',
      description:
        'Read the content of a specific file from Google Drive by its file ID. Works with Google Docs, text files, and PDFs. For images, returns metadata. Get file IDs from the browseDrive tool.',
      inputSchema: z.object({
        fileId: z.string().describe('The Google Drive file ID'),
        fileName: z.string().describe('The file name'),
        mimeType: z.string().describe('The MIME type of the file'),
      }),
      outputSchema: z.object({
        output: z.object({
          content: z.string(),
          message: z.string(),
        }),
      }),
      execute: async (args) => {
        const { context } = args;
        const fileId = context?.fileId as string;
        const fileName = context?.fileName as string;
        const mimeType = context?.mimeType as string;

        if (!this._googleDriveService.isConfigured()) {
          return {
            output: {
              content: '',
              message:
                'Google Drive is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON env var.',
            },
          };
        }

        const content = await this._googleDriveService.readFileContent({
          id: fileId,
          name: fileName,
          mimeType,
        });

        if (!content) {
          return {
            output: {
              content: '',
              message: `Could not read file "${fileName}". It may be empty or in an unsupported format.`,
            },
          };
        }

        return {
          output: {
            content,
            message: `Successfully read "${fileName}".`,
          },
        };
      },
    });
  }
}
