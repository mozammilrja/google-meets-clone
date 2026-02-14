import { OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { ParticipantPresence } from './interfaces/participant-presence.interface';
export declare class RedisSignalingService implements OnModuleDestroy {
    private readonly redisService;
    private readonly logger;
    private readonly instanceId;
    constructor(redisService: RedisService);
    onModuleDestroy(): Promise<void>;
    addParticipant(presence: ParticipantPresence): Promise<void>;
    removeParticipant(meetingId: string, participantId: string): Promise<ParticipantPresence | null>;
    removeParticipantBySocket(socketId: string): Promise<ParticipantPresence | null>;
    updateMediaState(meetingId: string, participantId: string, updates: {
        audio?: boolean;
        video?: boolean;
        screenSharing?: boolean;
    }): Promise<ParticipantPresence | null>;
    getParticipants(meetingId: string): Promise<ParticipantPresence[]>;
    getParticipant(meetingId: string, participantId: string): Promise<ParticipantPresence | null>;
    getParticipantBySocket(socketId: string): Promise<ParticipantPresence | null>;
    isParticipantInMeeting(meetingId: string, participantId: string): Promise<boolean>;
    getParticipantCount(meetingId: string): Promise<number>;
    refreshPresence(meetingId: string, participantId: string): Promise<void>;
    getMeetingServer(meetingId: string): Promise<string | null>;
    getInstanceMeetings(): Promise<string[]>;
    getGlobalStats(): Promise<{
        totalMeetings: number;
        totalParticipants: number;
    }>;
    private cleanupEmptyMeeting;
    private cleanupInstance;
    getInstanceId(): string;
}
