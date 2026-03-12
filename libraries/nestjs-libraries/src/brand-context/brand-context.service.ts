import { Injectable, Logger } from '@nestjs/common';
import { BrandContextRepository } from '@gitroom/nestjs-libraries/brand-context/brand-context.repository';
import {
  CreateBrandContextDto,
  UpdateBrandContextDto,
} from '@gitroom/nestjs-libraries/brand-context/dto/brand-context.dto';
import { GoogleDriveService } from '@gitroom/nestjs-libraries/google-drive/google-drive.service';

interface EnrichedContext {
  type: string;
  name: string;
  content: string;
  priority: number;
  location?: string | null;
}

@Injectable()
export class BrandContextService {
  private readonly _logger = new Logger(BrandContextService.name);

  constructor(
    private _repository: BrandContextRepository,
    private _googleDriveService: GoogleDriveService
  ) {}

  private _extractFolderIdIfUrl(dto: { googleDriveFolderId?: string }) {
    if (dto.googleDriveFolderId) {
      const extracted = this._googleDriveService.extractFolderIdFromUrl(
        dto.googleDriveFolderId
      );
      dto.googleDriveFolderId = extracted || undefined;
    }
  }

  create(orgId: string, data: CreateBrandContextDto) {
    this._extractFolderIdIfUrl(data);
    return this._repository.create(orgId, data);
  }

  findAll(orgId: string) {
    return this._repository.findAll(orgId);
  }

  findById(orgId: string, id: string) {
    return this._repository.findById(orgId, id);
  }

  findByProjectTag(orgId: string, projectTag: string) {
    return this._repository.findByProjectTag(orgId, projectTag);
  }

  findActiveByOrg(orgId: string) {
    return this._repository.findActiveByOrg(orgId);
  }

  update(orgId: string, id: string, data: UpdateBrandContextDto) {
    this._extractFolderIdIfUrl(data);
    return this._repository.update(orgId, id, data);
  }

  delete(orgId: string, id: string) {
    return this._repository.softDelete(orgId, id);
  }

  getDistinctProjectTags(orgId: string) {
    return this._repository.getDistinctProjectTags(orgId);
  }

  async getEnrichedContent(context: {
    content: string;
    googleDriveFolderId?: string | null;
    id?: string;
  }): Promise<string> {
    let content = context.content || '';

    if (
      context.googleDriveFolderId &&
      this._googleDriveService.isConfigured()
    ) {
      try {
        const driveContent =
          await this._googleDriveService.getTextFromDriveFolder(
            context.googleDriveFolderId
          );
        if (driveContent) {
          content += '\n\n--- Google Drive Materials ---\n\n' + driveContent;
        }
      } catch (error: any) {
        this._logger.warn(
          `Failed to fetch Drive content for brand context ${context.id}: ${error.message}`
        );
      }
    }

    return content;
  }

  async getEnrichedContextsForProject(
    orgId: string,
    projectTag: string
  ): Promise<EnrichedContext[]> {
    const brandContexts = await this._repository.findByProjectTag(
      orgId,
      projectTag
    );
    const allOrgContexts = await this._repository.findActiveByOrg(orgId);

    // Combine project-specific + org-level contexts
    const relevantContexts = [
      ...brandContexts,
      ...allOrgContexts.filter(
        (c) => !c.projectTag || c.projectTag === projectTag
      ),
    ];

    // Remove duplicates by id
    const uniqueContexts = [
      ...new Map(relevantContexts.map((c) => [c.id, c])).values(),
    ];

    // Sort by priority descending
    uniqueContexts.sort((a, b) => b.priority - a.priority);

    // Enrich each context with Drive content
    const enriched: EnrichedContext[] = [];
    for (const ctx of uniqueContexts) {
      const content = await this.getEnrichedContent(ctx);
      enriched.push({
        type: ctx.type,
        name: ctx.name,
        content,
        priority: ctx.priority,
        location: ctx.location,
      });
    }

    return enriched;
  }

  async testDriveConnection(folderUrl: string) {
    if (!this._googleDriveService.isConfigured()) {
      return {
        success: false,
        error: 'Google Drive integration is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON env var.',
      };
    }

    const folderId =
      this._googleDriveService.extractFolderIdFromUrl(folderUrl);
    if (!folderId) {
      return {
        success: false,
        error: 'Invalid Google Drive folder URL.',
      };
    }

    try {
      const files = await this._googleDriveService.listFiles(folderId);
      return {
        success: true,
        folderId,
        fileCount: files.length,
        files: files.map((f) => ({ name: f.name, type: f.mimeType })),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to access folder.',
      };
    }
  }
}
