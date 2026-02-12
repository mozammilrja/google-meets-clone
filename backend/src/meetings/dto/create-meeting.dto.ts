import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

class ParticipantInput {
  @IsString()
  email!: string;

  @IsString()
  role!: 'host' | 'participant';
}

class MeetingSettingsInput {
  @IsBoolean()
  @IsOptional()
  waitingRoomEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  recordingEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  allowGuestJoin?: boolean;

  @IsInt()
  @Min(2)
  @IsOptional()
  maxParticipants?: number;
}

export class CreateMeetingDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  scheduledAt?: string;

  @IsInt()
  @Min(5)
  @IsOptional()
  duration?: number;

  @IsArray()
  @IsOptional()
  participants?: ParticipantInput[];

  @IsOptional()
  settings?: MeetingSettingsInput;
}
