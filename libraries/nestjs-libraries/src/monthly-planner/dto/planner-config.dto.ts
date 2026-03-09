import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CreatePlannerConfigDto {
  @IsString() projectTag: string;
  @IsNumber() @IsOptional() postsPerWeek?: number;
  @IsArray() @IsOptional() preferredCategories?: string[];
  @IsString() @IsOptional() contentGuidelines?: string;
}

export class UpdatePlannerConfigDto {
  @IsNumber() @IsOptional() postsPerWeek?: number;
  @IsArray() @IsOptional() preferredCategories?: string[];
  @IsString() @IsOptional() contentGuidelines?: string;
}
