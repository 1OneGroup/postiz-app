import { IsDefined, IsDateString, IsString } from 'class-validator';

export class ScheduleProjectPostDto {
  @IsDefined()
  @IsString()
  integrationId: string;

  @IsDefined()
  @IsDateString()
  date: string;
}
