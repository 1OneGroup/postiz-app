import { extname } from 'path';
import mime from 'mime-types';

/**
 * Resolve file extension from multiple sources with fallback chain:
 * 1. Extract from originalname (e.g., "photo.jpg" → ".jpg")
 * 2. Derive from MIME type (e.g., "image/jpeg" → ".jpeg")
 * 3. Default to ".png" as last resort (since we only accept images/mp4)
 */
export function resolveFileExtension(
  originalname?: string,
  mimetype?: string
): string {
  // Try originalname first
  if (originalname) {
    const ext = extname(originalname);
    if (ext && ext !== '.') return ext;
  }

  // Try MIME type
  if (mimetype) {
    const ext = mime.extension(mimetype);
    if (ext) return `.${ext}`;
  }

  // Fallback — images are validated upstream, so .png is safe
  return '.png';
}
