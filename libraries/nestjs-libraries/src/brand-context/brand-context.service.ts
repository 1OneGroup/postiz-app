import { Injectable, Logger } from '@nestjs/common';
import { BrandContextRepository } from '@gitroom/nestjs-libraries/brand-context/brand-context.repository';
import {
  CreateBrandContextDto,
  UpdateBrandContextDto,
} from '@gitroom/nestjs-libraries/brand-context/dto/brand-context.dto';
import {
  GoogleDriveService,
  DriveImage,
} from '@gitroom/nestjs-libraries/google-drive/google-drive.service';

export { DriveImage };

import type {
  IntentObject,
  CategorizedAssetBundle,
} from '@gitroom/nestjs-libraries/brand-context/branded-pipeline.types';

export type { IntentObject, CategorizedAssetBundle };

export interface EnrichedContext {
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

  async getProjectAssetImages(
    orgId: string,
    projectTag: string
  ): Promise<DriveImage[]> {
    if (!this._googleDriveService.isConfigured()) return [];

    try {
      const brandContexts = await this._repository.findByProjectTag(
        orgId,
        projectTag
      );
      const allOrgContexts = await this._repository.findActiveByOrg(orgId);

      // Combine project-specific + org-level contexts that have Drive folders
      const contextsWithDrive = [
        ...brandContexts,
        ...allOrgContexts.filter(
          (c) => !c.projectTag || c.projectTag === projectTag
        ),
      ]
        .filter(
          (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i // deduplicate
        )
        .filter((c) => c.googleDriveFolderId);

      if (contextsWithDrive.length === 0) return [];

      const allImages: DriveImage[] = [];
      const seenNames = new Set<string>();

      for (const ctx of contextsWithDrive) {
        const images = await this._googleDriveService.getImagesFromDriveFolder(
          ctx.googleDriveFolderId!
        );
        for (const img of images) {
          if (!seenNames.has(img.name)) {
            seenNames.add(img.name);
            allImages.push(img);
          }
        }
        if (allImages.length >= 5) break;
      }

      return allImages.slice(0, 5);
    } catch (err: any) {
      this._logger.warn(
        `Failed to fetch project asset images for ${projectTag}: ${err.message}`
      );
      return [];
    }
  }

  async getDriveFolderIds(
    orgId: string,
    projectTag: string
  ): Promise<Array<{ name: string; folderId: string }>> {
    const brandContexts = await this._repository.findByProjectTag(
      orgId,
      projectTag
    );
    const allOrgContexts = await this._repository.findActiveByOrg(orgId);

    const relevantContexts = [
      ...brandContexts,
      ...allOrgContexts.filter(
        (c) => !c.projectTag || c.projectTag === projectTag
      ),
    ];

    // Deduplicate by id, filter to those with Drive folders
    const uniqueWithDrive = [
      ...new Map(relevantContexts.map((c) => [c.id, c])).values(),
    ].filter((c) => c.googleDriveFolderId);

    return uniqueWithDrive.map((c) => ({
      name: c.name,
      folderId: c.googleDriveFolderId!,
    }));
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

  /**
   * Step 2: Targeted Asset Fetch.
   * Given an intent object and a project root Drive folder ID,
   * fetches categorized assets from the appropriate subfolders.
   */
  async assembleTargetedAssets(
    intent: IntentObject,
    projectRootFolderId: string
  ): Promise<CategorizedAssetBundle> {
    const bundle: CategorizedAssetBundle = {
      logo: null,
      styleReferences: [],
      sceneReferences: [],
      brandRules: null,
      parentLogo: null,
    };

    if (!this._googleDriveService.isConfigured() || !projectRootFolderId) {
      return bundle;
    }

    try {
      // Determine which image subfolders to query
      const imageSubfolders = intent.requiredAssets.filter(
        (s) => !['brand-guide', 'brochures'].includes(s)
      );

      // Fetch images from targeted subfolders (max 2 per subfolder)
      const imagesBySubfolder =
        await this._googleDriveService.getImagesFromSubfolders(
          projectRootFolderId,
          imageSubfolders,
          2
        );

      // Assign logo from logos/ subfolder
      const logos = imagesBySubfolder.get('logos') || [];
      if (logos.length > 0) {
        bundle.logo = {
          image: logos[0],
          instruction: `Reproduce this brand logo EXACTLY at ${intent.logoPlacement}. Do not modify its colors, proportions, or design. Ensure it is clearly legible against the background.`,
        };
      }

      // Assign style references from gallery/
      const gallery = imagesBySubfolder.get('gallery') || [];
      for (const img of gallery.slice(0, 2)) {
        bundle.styleReferences.push({
          image: img,
          instruction:
            "Match this past creative's color palette, visual richness, and premium aesthetic. Do NOT copy its layout — only its visual style and color grading.",
        });
      }

      // Assign scene references from renders/ or photos/
      const renders = imagesBySubfolder.get('renders') || [];
      const photos = imagesBySubfolder.get('photos') || [];
      const sceneImages = [...renders, ...photos].slice(0, 2);
      for (const img of sceneImages) {
        bundle.sceneReferences.push({
          image: img,
          instruction:
            'Use as background scene reference or compositional context for the creative.',
        });
      }

      // Fetch brand rules text from brand-guide/ subfolder
      if (intent.requiredAssets.includes('brand-guide')) {
        const brandGuideText =
          await this._googleDriveService.getTextFromSubfolder(
            projectRootFolderId,
            'brand-guide'
          );

        if (brandGuideText) {
          bundle.brandRules = {
            text: brandGuideText,
            colorPalette: this._extractColors(brandGuideText),
            fonts: this._extractFonts(brandGuideText),
          };
        }
      }

      // Fallback: if no logo found, try to get parent logo from root
      if (!bundle.logo) {
        try {
          // Discover parent folder by checking root for shared logos
          const subfolders =
            await this._googleDriveService.discoverSubfolders(
              projectRootFolderId
            );
          this._logger.warn(
            `No logo found in project subfolder. Available subfolders: ${[...subfolders.keys()].join(', ')}`
          );
        } catch {
          // ignore
        }
      }

      this._logger.log(
        `Assembled asset bundle: logo=${!!bundle.logo}, styles=${bundle.styleReferences.length}, scenes=${bundle.sceneReferences.length}, rules=${!!bundle.brandRules}`
      );
    } catch (err: any) {
      this._logger.error(
        `Failed to assemble targeted assets: ${err.message}`
      );
    }

    return bundle;
  }

  /**
   * Extract color hex codes from brand guide text.
   */
  private _extractColors(text: string): string[] {
    const hexPattern = /#[0-9A-Fa-f]{6}\b/g;
    const matches = text.match(hexPattern) || [];
    return [...new Set(matches)];
  }

  /**
   * Extract font names from brand guide text.
   */
  private _extractFonts(text: string): string[] {
    const fontPatterns = [
      /font[- ]?family[:\s]+["']?([^"'\n,;]+)/gi,
      /typeface[:\s]+["']?([^"'\n,;]+)/gi,
      /(Montserrat|Playfair|Roboto|Open Sans|Lato|Poppins|Raleway|Cormorant|DM Sans|Inter|Nunito|Merriweather|Georgia|Garamond|Futura|Helvetica|Arial)/gi,
    ];

    const fonts = new Set<string>();
    for (const pattern of fontPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          fonts.add(match[1].trim());
        }
      }
    }
    return [...fonts];
  }
}
