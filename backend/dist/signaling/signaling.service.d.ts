import { ParticipantPresence } from './interfaces/participant-presence.interface';
export declare class SignalingService {
    private readonly logger;
    private readonly rooms;
    private readonly socketToPresence;
    addParticipant(presence: ParticipantPresence): void;
    removeParticipant(meetingId: string, participantId: string): ParticipantPresence | null;
    removeParticipantBySocket(socketId: string): ParticipantPresence | null;
    updateMediaState(meetingId: string, participantId: string, updates: {
        audio?: boolean;
        video?: boolean;
        screenSharing?: boolean;
    }): ParticipantPresence | null;
    getParticipants(meetingId: string): ParticipantPresence[];
    getParticipant(meetingId: string, participantId: string): ParticipantPresence | null;
    getParticipantBySocket(socketId: string): ParticipantPresence | null;
    isParticipantInMeeting(meetingId: string, participantId: string): boolean;
    getParticipantCount(meetingId: string): number;
}
