import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class GenerateMonthlyPlanDto {
  @IsString() projectTag: string;
  @IsString() month: string; // format: "2026-04"
  @IsNumber() @IsOptional() postsPerWeek?: number;
  @IsArray() @IsOptional() integrationIds?: string[];
}
