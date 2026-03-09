import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum BrandContextType {
  project = 'project',
  company = 'company',
  voice = 'voice',
  compliance = 'compliance',
}

export class CreateBrandContextDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(BrandContextType)
  type?: BrandContextType;

  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsString()
  projectTag?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateBrandContextDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(BrandContextType)
  type?: BrandContextType;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsString()
  projectTag?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
