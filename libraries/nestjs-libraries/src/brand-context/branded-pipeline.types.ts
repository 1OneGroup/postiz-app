import { DriveImage } from '@gitroom/nestjs-libraries/google-drive/google-drive.service';

// --- Content Type Classification ---

export type ContentType =
  | 'festival_greeting'
  | 'construction_update'
  | 'offer_announcement'
  | 'lifestyle'
  | 'milestone'
  | 'generic';

export type AspectRatio = '1:1' | '9:16' | '4:5' | '16:9';

export type LogoPlacement = 'top-center' | 'top-left' | 'top-right';

// --- Step 1 Output: Intent Analysis ---

export interface IntentObject {
  contentType: ContentType;
  occasion: string | null;
  culturalContext: string | null;
  visualSubject: string;
  mood: string;
  headline: string;
  subtitle: string | null;
  greeting: string | null;
  taglineBar: string | null;
  aspectRatio: AspectRatio;
  requiredAssets: string[];
  logoPlacement: LogoPlacement;
  complianceText: string | null;
}

// --- Step 2 Output: Categorized Asset Bundle ---

export interface CategorizedAssetBundle {
  logo: {
    image: DriveImage;
    instruction: string;
  } | null;

  styleReferences: Array<{
    image: DriveImage;
    instruction: string;
  }>;

  sceneReferences: Array<{
    image: DriveImage;
    instruction: string;
  }>;

  brandRules: {
    text: string;
    colorPalette: string[];
    fonts: string[];
  } | null;

  parentLogo: DriveImage | null;
}

// --- Step 5 Output: Validation ---

export interface ValidationResult {
  passed: boolean;
  deficiencies: string[];
  score: number;
}
