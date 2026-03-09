import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateImageTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  projectTag?: string;

  @IsObject()
  @IsOptional()
  visualRules?: Record<string, any>;

  @IsString()
  promptSkeleton: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  linkedAssetIds?: string[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateImageTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  projectTag?: string;

  @IsObject()
  @IsOptional()
  visualRules?: Record<string, any>;

  @IsString()
  @IsOptional()
  promptSkeleton?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  linkedAssetIds?: string[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
