import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateMediaFolderDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  type?: string = 'general';

  @IsString()
  @IsOptional()
  parentId?: string;
}

export class UpdateMediaFolderDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  type?: string;
}

export class MoveMediaDto {
  @IsArray()
  @IsString({ each: true })
  mediaIds: string[];

  @IsString()
  @IsOptional()
  folderId?: string | null;
}
