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
export interface MeetingRoom {
    meetingId: string;
    participants: Map<string, ParticipantPresence>;
}
