import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SignalingService } from './signaling.service';
import { AuditService } from '../audit/audit.service';
import { ChatService } from '../meetings/services/chat.service';
import { RedisService } from '../redis/redis.service';
import { JoinMeetingDto, LeaveMeetingDto, OfferDto, AnswerDto, IceCandidateDto, MediaStateDto, MeetingStateSyncDto, SendMessageDto } from './dto/signaling-events.dto';
export declare class SignalingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly signalingService;
    private readonly auditService;
    private readonly chatService;
    private readonly jwtService;
    private readonly redisService;
    private readonly configService;
    server: Server;
    private readonly logger;
    constructor(signalingService: SignalingService, auditService: AuditService, chatService: ChatService, jwtService: JwtService, redisService: RedisService, configService: ConfigService);
    afterInit(server: Server): void;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    handleJoinMeeting(data: JoinMeetingDto, client: Socket): Promise<{
        success: boolean;
        participantCount: number;
    }>;
    handleLeaveMeeting(data: LeaveMeetingDto, client: Socket): Promise<{
        success: boolean;
    }>;
    handleOffer(data: OfferDto, client: Socket): Promise<{
        success: boolean;
    }>;
    handleAnswer(data: AnswerDto, client: Socket): Promise<{
        success: boolean;
    }>;
    handleIceCandidate(data: IceCandidateDto, client: Socket): Promise<{
        success: boolean;
    }>;
    handleMediaState(data: MediaStateDto, client: Socket): Promise<{
        success: boolean;
    }>;
    handleMeetingStateSync(data: MeetingStateSyncDto, client: Socket): Promise<{
        meetingId: string;
        participants: {
            participantId: string;
            userId: string;
            name: string;
            role: "guest" | "participant" | "host" | "admin";
            audio: boolean;
            video: boolean;
            screenSharing: boolean;
        }[];
        timestamp: Date;
    }>;
    handleSendMessage(data: SendMessageDto, client: Socket): Promise<{
        success: boolean;
        messageId: import("mongoose").Types.ObjectId;
    }>;
}
