import { Injectable, Logger } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

export interface DriveImage {
  name: string;
  mimeType: string;
  base64: string;
  fileId: string;
}

const IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

const MAX_DRIVE_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per image

const SUPPORTED_MIME_TYPES = [
  'application/vnd.google-apps.document',
  'text/plain',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_OUTPUT = 50 * 1024; // 50KB text cap

@Injectable()
export class GoogleDriveService {
  private readonly _logger = new Logger(GoogleDriveService.name);
  private _drive: drive_v3.Drive | null = null;

  constructor() {
    this._initClient();
  }

  private _initClient(): void {
    const b64Key = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!b64Key) {
      this._logger.warn(
        'GOOGLE_SERVICE_ACCOUNT_JSON not set — Google Drive integration disabled'
      );
      return;
    }

    try {
      const keyJson = JSON.parse(
        Buffer.from(b64Key, 'base64').toString('utf-8')
      );
      const auth = new GoogleAuth({
        credentials: keyJson,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
      this._drive = google.drive({ version: 'v3', auth });
      this._logger.log('Google Drive client initialized successfully');
    } catch (err: any) {
      this._logger.error(
        `Failed to initialize Google Drive client: ${err.message}`
      );
    }
  }

  isConfigured(): boolean {
    return this._drive !== null;
  }

  extractFolderIdFromUrl(url: string): string | null {
    if (!url) return null;

    // Already a plain folder ID (no slashes, no dots)
    if (/^[a-zA-Z0-9_-]+$/.test(url) && url.length > 10) {
      return url;
    }

    // Parse URL patterns:
    // https://drive.google.com/drive/folders/FOLDER_ID
    // https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
    // https://drive.google.com/drive/u/0/folders/FOLDER_ID
    const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  async listFiles(folderId: string): Promise<DriveFile[]> {
    if (!this._drive) return [];

    try {
      const response = await this._drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size)',
        pageSize: 100,
      });

      const files = (response.data.files || []) as DriveFile[];

      return files.filter((f) => {
        // Check supported mime type
        const isSupported = SUPPORTED_MIME_TYPES.some(
          (mime) =>
            f.mimeType === mime || (mime.endsWith('/*') === false && f.mimeType.startsWith('image/'))
        );
        // Skip oversized files (Google Docs have no size field)
        const size = f.size ? parseInt(f.size, 10) : 0;
        if (size > MAX_FILE_SIZE) {
          this._logger.warn(`Skipping large file: ${f.name} (${size} bytes)`);
          return false;
        }
        return isSupported;
      });
    } catch (err: any) {
      this._logger.error(
        `Failed to list files in folder ${folderId}: ${err.message}`
      );
      return [];
    }
  }

  async readFileContent(file: DriveFile): Promise<string> {
    if (!this._drive) return '';

    try {
      const { mimeType, id, name } = file;

      // Google Docs — export as plain text
      if (mimeType === 'application/vnd.google-apps.document') {
        const response = await this._drive.files.export({
          fileId: id,
          mimeType: 'text/plain',
        });
        return `[Doc: ${name}]\n${String(response.data)}`;
      }

      // Plain text files
      if (mimeType === 'text/plain') {
        const response = await this._drive.files.get(
          { fileId: id, alt: 'media' },
          { responseType: 'text' }
        );
        return `[File: ${name}]\n${String(response.data)}`;
      }

      // PDF files
      if (mimeType === 'application/pdf') {
        const response = await this._drive.files.get(
          { fileId: id, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        try {
          const pdfParse = require('pdf-parse');
          const result = await pdfParse(Buffer.from(response.data as ArrayBuffer));
          return `[PDF: ${name}]\n${result.text}`;
        } catch (pdfErr: any) {
          this._logger.warn(
            `Failed to parse PDF ${name}: ${pdfErr.message}`
          );
          return `[PDF: ${name}] (could not extract text)`;
        }
      }

      // Images — return metadata (description via Gemini can be added later)
      if (mimeType.startsWith('image/')) {
        return `[Image: ${name}] (brand image, type: ${mimeType})`;
      }

      return '';
    } catch (err: any) {
      this._logger.warn(
        `Failed to read file ${file.name}: ${err.message}`
      );
      return '';
    }
  }

  async getTextFromDriveFolder(folderId: string): Promise<string> {
    if (!this._drive || !folderId) return '';

    try {
      const files = await this.listFiles(folderId);
      if (files.length === 0) return '';

      const parts: string[] = [];
      let totalLength = 0;

      for (const file of files) {
        if (totalLength >= MAX_TOTAL_OUTPUT) {
          this._logger.warn(
            `Output cap reached (${MAX_TOTAL_OUTPUT} bytes), skipping remaining files`
          );
          break;
        }

        const content = await this.readFileContent(file);
        if (content) {
          const remaining = MAX_TOTAL_OUTPUT - totalLength;
          const truncated =
            content.length > remaining ? content.slice(0, remaining) : content;
          parts.push(truncated);
          totalLength += truncated.length;
        }
      }

      return parts.join('\n\n');
    } catch (err: any) {
      this._logger.error(
        `Failed to fetch Drive folder ${folderId}: ${err.message}`
      );
      return '';
    }
  }

  async getImagesFromDriveFolder(folderId: string): Promise<DriveImage[]> {
    if (!this._drive || !folderId) return [];

    try {
      const response = await this._drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, modifiedTime)',
        pageSize: 50,
        orderBy: 'modifiedTime desc',
      });

      const files = (response.data.files || []).filter((f) => {
        if (!f.mimeType || !IMAGE_MIME_TYPES.includes(f.mimeType)) return false;
        const size = f.size ? parseInt(f.size, 10) : 0;
        if (size > MAX_IMAGE_SIZE) {
          this._logger.warn(
            `Skipping large image: ${f.name} (${size} bytes)`
          );
          return false;
        }
        return true;
      });

      const images: DriveImage[] = [];

      for (const file of files.slice(0, MAX_DRIVE_IMAGES)) {
        try {
          const imgResponse = await this._drive.files.get(
            { fileId: file.id!, alt: 'media' },
            { responseType: 'arraybuffer' }
          );

          const buffer = Buffer.from(imgResponse.data as ArrayBuffer);
          images.push({
            name: file.name || 'unknown',
            mimeType: file.mimeType!,
            base64: buffer.toString('base64'),
            fileId: file.id!,
          });
        } catch (imgErr: any) {
          this._logger.warn(
            `Failed to download image ${file.name}: ${imgErr.message}`
          );
        }
      }

      this._logger.log(
        `Fetched ${images.length} images from Drive folder ${folderId}`
      );
      return images;
    } catch (err: any) {
      this._logger.error(
        `Failed to fetch images from folder ${folderId}: ${err.message}`
      );
      return [];
    }
  }
}
