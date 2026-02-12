import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator';

/**
 * DTO for joining a meeting room via WebSocket
 */
export class JoinMeetingDto {
  @IsString()
  @IsNotEmpty()
  meetingId!: string;

  @IsString()
  @IsNotEmpty()
  participantId!: string;
}

/**
 * DTO for leaving a meeting room via WebSocket
 */
export class LeaveMeetingDto {
  @IsString()
  @IsNotEmpty()
  meetingId!: string;

  @IsString()
  @IsNotEmpty()
  participantId!: string;
}

/**
 * DTO for WebRTC offer signaling
 */
export class OfferDto {
  @IsString()
  @IsNotEmpty()
  meetingId!: string;

  @IsString()
  @IsNotEmpty()
  participantId!: string;

  @IsString()
  @IsNotEmpty()
  targetParticipantId!: string;

  @IsObject()
  @IsNotEmpty()
  sdp!: any; // RTCSessionDescriptionInit
}

/**
 * DTO for WebRTC answer signaling
 */
export class AnswerDto {
  @IsString()
  @IsNotEmpty()
  meetingId!: string;

  @IsString()
  @IsNotEmpty()
  participantId!: string;

  @IsString()
  @IsNotEmpty()
  targetParticipantId!: string;

  @IsObject()
  @IsNotEmpty()
  sdp!: any; // RTCSessionDescriptionInit
}

/**
 * DTO for WebRTC ICE candidate signaling
 */
export class IceCandidateDto {
  @IsString()
  @IsNotEmpty()
  meetingId!: string;

  @IsString()
  @IsNotEmpty()
  participantId!: string;

  @IsString()
  @IsNotEmpty()
  targetParticipantId!: string;

  @IsObject()
  @IsNotEmpty()
  candidate!: any; // RTCIceCandidateInit
}

/**
 * DTO for participant media state updates (audio/video/screen)
 */
export class MediaStateDto {
  @IsString()
  @IsNotEmpty()
  meetingId!: string;

  @IsString()
  @IsNotEmpty()
  participantId!: string;

  @IsBoolean()
  @IsOptional()
  audio?: boolean;

  @IsBoolean()
  @IsOptional()
  video?: boolean;

  @IsBoolean()
  @IsOptional()
  screenSharing?: boolean;
}

/**
 * DTO for meeting-wide state sync requests
 */
export class MeetingStateSyncDto {
  @IsString()
  @IsNotEmpty()
  meetingId!: string;
}
/**
 * DTO for sending a chat message in a meeting
 */
export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  meetingId!: string;

  @IsString()
  @IsNotEmpty()
  participantId!: string;

  @IsString()
  @IsNotEmpty()
  participantName!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}