import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { GoogleDriveService } from '@gitroom/nestjs-libraries/google-drive/google-drive.service';
import { BrandContextService } from '@gitroom/nestjs-libraries/brand-context/brand-context.service';

@Injectable()
export class BrowseDriveTool implements AgentToolInterface {
  constructor(
    private _googleDriveService: GoogleDriveService,
    private _brandContextService: BrandContextService
  ) {}
  name = 'browseDrive';

  run() {
    return createTool({
      id: 'browseDrive',
      description:
        'Browse Google Drive folders linked to this project. Lists all files and subfolders. Use without folderId to see root project folders, or pass a folderId to navigate into a subfolder.',
      inputSchema: z.object({
        folderId: z
          .string()
          .optional()
          .describe(
            'Specific folder ID to browse. Leave empty to browse root folders from brand context.'
          ),
      }),
      outputSchema: z.object({
        output: z.object({
          files: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              mimeType: z.string(),
              size: z.string().optional(),
              isFolder: z.boolean(),
            })
          ),
          message: z.string(),
        }),
      }),
      execute: async (args) => {
        const { context, runtimeContext } = args;
        const folderId = context?.folderId as string | undefined;

        if (!this._googleDriveService.isConfigured()) {
          return {
            output: {
              files: [],
              message:
                'Google Drive is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON env var.',
            },
          };
        }

        // If a specific folder ID is given, browse it directly
        if (folderId) {
          const files =
            await this._googleDriveService.listFolderContents(folderId);
          const folders = files.filter((f) => f.isFolder).length;
          const docs = files.length - folders;
          return {
            output: {
              files,
              message: `Found ${files.length} items (${folders} folders, ${docs} files).`,
            },
          };
        }

        // Otherwise, get root Drive folders from brand context
        // @ts-ignore
        const org = JSON.parse(runtimeContext.get('organization') as string);
        // @ts-ignore
        const projectName: string =
          runtimeContext.get('projectName' as never) || '';

        const driveFolders = await this._brandContextService.getDriveFolderIds(
          org.id,
          projectName
        );

        if (driveFolders.length === 0) {
          return {
            output: {
              files: [],
              message:
                'No Google Drive folders linked to this project. Link a Drive folder in Brand Context settings.',
            },
          };
        }

        // List contents of all root folders
        const allFiles: Array<{
          id: string;
          name: string;
          mimeType: string;
          size?: string;
          isFolder: boolean;
        }> = [];

        for (const folder of driveFolders) {
          const files = await this._googleDriveService.listFolderContents(
            folder.folderId
          );
          allFiles.push(...files);
        }

        const folders = allFiles.filter((f) => f.isFolder).length;
        const docs = allFiles.length - folders;
        return {
          output: {
            files: allFiles,
            message: `Found ${allFiles.length} items (${folders} folders, ${docs} files) across ${driveFolders.length} linked Drive folder(s).`,
          },
        };
      },
    });
  }
}
