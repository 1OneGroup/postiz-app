import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateProjectPostDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  suggestedPlatform?: string;

  @IsOptional()
  @IsDateString()
  suggestedDate?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
