import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export enum ProjectPostStatusDto {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
}

export class UpdateProjectPostDto {
  @IsOptional()
  @IsString()
  content?: string;

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
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(ProjectPostStatusDto)
  status?: ProjectPostStatusDto;
}
