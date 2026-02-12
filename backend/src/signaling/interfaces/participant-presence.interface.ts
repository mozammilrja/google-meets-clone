/**
 * In-memory representation of a participant's real-time presence
 * Used for tracking who is actively connected via WebSocket
 */
export interface ParticipantPresence {
  participantId: string;
  userId: string;
  meetingId: string;
  socketId: string;
  name: string;
  role: 'guest' | 'participant' | 'host' | 'admin';
  audio: boolean;
  video: boolean;
  screenSharing: boolean;
  connectedAt: Date;
}

/**
 * Meeting room state with active participants
 */
export interface MeetingRoom {
  meetingId: string;
  participants: Map<string, ParticipantPresence>;
}
