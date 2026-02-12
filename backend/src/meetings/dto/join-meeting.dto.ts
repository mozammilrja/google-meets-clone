import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class JoinMeetingDto {
  @IsString()
  name!: string;

  @IsBoolean()
  @IsOptional()
  audio?: boolean;

  @IsBoolean()
  @IsOptional()
  video?: boolean;
}
