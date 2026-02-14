"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SignalingGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const signaling_service_1 = require("./signaling.service");
const audit_service_1 = require("../audit/audit.service");
const chat_service_1 = require("../meetings/services/chat.service");
const redis_service_1 = require("../redis/redis.service");
const signaling_events_dto_1 = require("./dto/signaling-events.dto");
let SignalingGateway = SignalingGateway_1 = class SignalingGateway {
    constructor(signalingService, auditService, chatService, jwtService, redisService, configService) {
        this.signalingService = signalingService;
        this.auditService = auditService;
        this.chatService = chatService;
        this.jwtService = jwtService;
        this.redisService = redisService;
        this.configService = configService;
        this.logger = new common_1.Logger(SignalingGateway_1.name);
    }
    afterInit(server) {
        try {
            const pubClient = this.redisService.getPublisher();
            const subClient = this.redisService.getSubscriber();
            if (pubClient && subClient && typeof server.adapter === 'function') {
                server.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
                this.logger.log('Socket.IO Redis adapter initialized for multi-instance support');
            }
        }
        catch (error) {
            this.logger.warn('Failed to initialize Redis adapter, running in single-instance mode');
        }
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token || client.handshake.query?.token;
            if (!token) {
                this.logger.warn(`Connection rejected: No token provided (${client.id})`);
                client.disconnect();
                return;
            }
            const payload = await this.jwtService.verifyAsync(token);
            client.data.userId = payload.userId;
            client.data.email = payload.email;
            client.data.roles = payload.roles;
            this.logger.log(`Client connected: ${client.id} (user: ${payload.email})`);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.warn(`Connection rejected: Invalid token (${client.id}) - ${err.message}`);
            client.disconnect();
        }
    }
    async handleDisconnect(client) {
        const userId = client.data.userId;
        const socketId = client.id;
        const presence = this.signalingService.removeParticipantBySocket(socketId);
        if (presence) {
            this.server
                .to(presence.meetingId)
                .emit('participant-left', {
                participantId: presence.participantId,
                userId: presence.userId,
                name: presence.name,
                leftAt: new Date(),
            });
            if (userId) {
                await this.auditService.log({
                    actorId: userId,
                    actorIP: client.handshake.address,
                    actorUserAgent: client.handshake.headers['user-agent'] || 'Unknown',
                    action: 'signaling.disconnect',
                    resource: 'meeting',
                    resourceId: presence.meetingId,
                    metadata: {
                        participantId: presence.participantId,
                        reason: 'socket_disconnect',
                    },
                    success: true,
                });
            }
            this.logger.log(`Client disconnected: ${socketId} (user: ${userId}, participant: ${presence.participantId})`);
        }
        else {
            this.logger.log(`Client disconnected: ${socketId} (user: ${userId})`);
        }
    }
    async handleJoinMeeting(data, client) {
        const { meetingId, participantId, name } = data;
        const userId = client.data.userId;
        this.logger.log(`[join-meeting] User ${userId} / Participant ${participantId} (name: ${name}) joining room: ${meetingId}`);
        try {
            await client.join(meetingId);
            const rooms = Array.from(client.rooms);
            this.logger.log(`[join-meeting] Client ${client.id} is now in rooms: ${rooms.join(', ')}`);
            const presence = {
                participantId,
                userId,
                meetingId,
                socketId: client.id,
                name: name || client.data.email || 'Guest',
                role: 'participant',
                audio: false,
                video: false,
                screenSharing: false,
                connectedAt: new Date(),
            };
            this.signalingService.addParticipant(presence);
            const participants = this.signalingService.getParticipants(meetingId);
            client.to(meetingId).emit('participant-joined', {
                participantId: presence.participantId,
                userId: presence.userId,
                name: presence.name,
                role: presence.role,
                audio: presence.audio,
                video: presence.video,
                screenSharing: presence.screenSharing,
                joinedAt: presence.connectedAt,
            });
            client.emit('meeting-state', {
                meetingId,
                participants: participants.map((p) => ({
                    participantId: p.participantId,
                    userId: p.userId,
                    name: p.name,
                    role: p.role,
                    audio: p.audio,
                    video: p.video,
                    screenSharing: p.screenSharing,
                })),
                timestamp: new Date(),
            });
            if (userId) {
                await this.auditService.log({
                    actorId: userId,
                    actorIP: client.handshake.address,
                    actorUserAgent: client.handshake.headers['user-agent'] || 'Unknown',
                    action: 'signaling.join_meeting',
                    resource: 'meeting',
                    resourceId: meetingId,
                    metadata: {
                        participantId,
                        participantCount: participants.length,
                    },
                    success: true,
                });
            }
            this.logger.log(`Participant ${participantId} joined meeting ${meetingId} via socket ${client.id}`);
            return { success: true, participantCount: participants.length };
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Error in join-meeting: ${err.message}`, err.stack);
            if (userId) {
                await this.auditService.log({
                    actorId: userId,
                    actorIP: client.handshake.address,
                    actorUserAgent: client.handshake.headers['user-agent'] || 'Unknown',
                    action: 'signaling.join_meeting',
                    resource: 'meeting',
                    resourceId: meetingId,
                    metadata: { participantId, error: err.message },
                    success: false,
                    errorMessage: err.message,
                });
            }
            throw new websockets_1.WsException(err.message);
        }
    }
    async handleLeaveMeeting(data, client) {
        const { meetingId, participantId } = data;
        const userId = client.data.userId;
        try {
            const presence = this.signalingService.removeParticipant(meetingId, participantId);
            if (presence) {
                await client.leave(meetingId);
                client.to(meetingId).emit('participant-left', {
                    participantId,
                    userId,
                    name: presence.name,
                    leftAt: new Date(),
                });
                await this.auditService.log({
                    actorId: userId,
                    actorIP: client.handshake.address,
                    actorUserAgent: client.handshake.headers['user-agent'] || 'Unknown',
                    action: 'signaling.leave_meeting',
                    resource: 'meeting',
                    resourceId: meetingId,
                    metadata: { participantId },
                    success: true,
                });
                this.logger.log(`Participant ${participantId} left meeting ${meetingId}`);
                return { success: true };
            }
            else {
                throw new Error('Participant not found in meeting');
            }
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Error in leave-meeting: ${err.message}`, err.stack);
            await this.auditService.log({
                actorId: userId,
                actorIP: client.handshake.address,
                actorUserAgent: client.handshake.headers['user-agent'] || 'Unknown',
                action: 'signaling.leave_meeting',
                resource: 'meeting',
                resourceId: meetingId,
                metadata: { participantId, error: err.message },
                success: false,
                errorMessage: err.message,
            });
            throw new websockets_1.WsException(err.message);
        }
    }
    async handleOffer(data, client) {
        const { meetingId, participantId, targetParticipantId, sdp } = data;
        try {
            if (!this.signalingService.isParticipantInMeeting(meetingId, participantId)) {
                throw new Error('Participant not in meeting');
            }
            const targetPresence = this.signalingService.getParticipant(meetingId, targetParticipantId);
            if (!targetPresence) {
                throw new Error('Target participant not found');
            }
            this.server.to(targetPresence.socketId).emit('offer', {
                participantId,
                sdp,
            });
            this.logger.debug(`Forwarded WebRTC offer from ${participantId} to ${targetParticipantId} in meeting ${meetingId}`);
            return { success: true };
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Error in offer: ${err.message}`, err.stack);
            throw new websockets_1.WsException(err.message);
        }
    }
    async handleAnswer(data, client) {
        const { meetingId, participantId, targetParticipantId, sdp } = data;
        try {
            if (!this.signalingService.isParticipantInMeeting(meetingId, participantId)) {
                throw new Error('Participant not in meeting');
            }
            const targetPresence = this.signalingService.getParticipant(meetingId, targetParticipantId);
            if (!targetPresence) {
                throw new Error('Target participant not found');
            }
            this.server.to(targetPresence.socketId).emit('answer', {
                participantId,
                sdp,
            });
            this.logger.debug(`Forwarded WebRTC answer from ${participantId} to ${targetParticipantId} in meeting ${meetingId}`);
            return { success: true };
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Error in answer: ${err.message}`, err.stack);
            throw new websockets_1.WsException(err.message);
        }
    }
    async handleIceCandidate(data, client) {
        const { meetingId, participantId, targetParticipantId, candidate } = data;
        try {
            if (!this.signalingService.isParticipantInMeeting(meetingId, participantId)) {
                throw new Error('Participant not in meeting');
            }
            const targetPresence = this.signalingService.getParticipant(meetingId, targetParticipantId);
            if (!targetPresence) {
                throw new Error('Target participant not found');
            }
            this.server.to(targetPresence.socketId).emit('ice-candidate', {
                participantId,
                candidate,
            });
            this.logger.debug(`Forwarded ICE candidate from ${participantId} to ${targetParticipantId} in meeting ${meetingId}`);
            return { success: true };
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Error in ice-candidate: ${err.message}`, err.stack);
            throw new websockets_1.WsException(err.message);
        }
    }
    async handleMediaState(data, client) {
        const { meetingId, participantId, audio, video, screenSharing } = data;
        const userId = client.data.userId;
        try {
            const presence = this.signalingService.updateMediaState(meetingId, participantId, { audio, video, screenSharing });
            if (!presence) {
                throw new Error('Participant not found in meeting');
            }
            this.server.to(meetingId).emit('participant-updated', {
                participantId,
                audio: presence.audio,
                video: presence.video,
                screenSharing: presence.screenSharing,
                timestamp: new Date(),
            });
            this.logger.log(`Media state updated for ${participantId} in meeting ${meetingId}: audio=${presence.audio}, video=${presence.video}, screen=${presence.screenSharing}`);
            return { success: true };
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Error in media-state: ${err.message}`, err.stack);
            throw new websockets_1.WsException(err.message);
        }
    }
    async handleMeetingStateSync(data, client) {
        const { meetingId } = data;
        try {
            const participants = this.signalingService.getParticipants(meetingId);
            return {
                meetingId,
                participants: participants.map((p) => ({
                    participantId: p.participantId,
                    userId: p.userId,
                    name: p.name,
                    role: p.role,
                    audio: p.audio,
                    video: p.video,
                    screenSharing: p.screenSharing,
                })),
                timestamp: new Date(),
            };
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Error in meeting-state-sync: ${err.message}`, err.stack);
            throw new websockets_1.WsException(err.message);
        }
    }
    async handleSendMessage(data, client) {
        const { meetingId, participantId, participantName, message } = data;
        const userId = client.data.userId;
        this.logger.log(`[Chat] Received send-message from ${participantId} in meeting ${meetingId}: "${message}"`);
        try {
            if (!message || message.trim().length === 0) {
                throw new Error('Message cannot be empty');
            }
            if (message.length > 1000) {
                throw new Error('Message cannot exceed 1000 characters');
            }
            const savedMessage = await this.chatService.saveMessage(meetingId, participantId, participantName, message);
            const roomSockets = await this.server.in(meetingId).fetchSockets();
            this.logger.log(`[Chat] Broadcasting to ${roomSockets.length} sockets in room ${meetingId}`);
            this.server.to(meetingId).emit('message-received', {
                id: savedMessage._id?.toString(),
                participantId,
                participantName,
                message,
                timestamp: savedMessage.timestamp,
            });
            this.logger.log(`Chat message sent in meeting ${meetingId} by ${participantId}`);
            if (userId) {
                await this.auditService.log({
                    actorId: userId,
                    actorIP: client.handshake.address,
                    actorUserAgent: client.handshake.headers['user-agent'] || 'Unknown',
                    action: 'chat.send_message',
                    resource: 'meeting',
                    resourceId: meetingId,
                    metadata: { participantId, messageLength: message.length },
                    success: true,
                });
            }
            return { success: true, messageId: savedMessage._id };
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Error in send-message: ${err.message}`, err.stack);
            throw new websockets_1.WsException(err.message);
        }
    }
    async handleReaction(data, client) {
        const { meetingId, participantId, emoji } = data;
        this.logger.log(`[Reaction] ${participantId} sent emoji "${emoji}" in meeting ${meetingId}`);
        try {
            if (!this.signalingService.isParticipantInMeeting(meetingId, participantId)) {
                throw new Error('Participant not in meeting');
            }
            const presence = this.signalingService.getParticipant(meetingId, participantId);
            const participantName = presence?.name || 'Unknown';
            this.server.to(meetingId).emit('reaction-received', {
                participantId,
                participantName,
                emoji,
                timestamp: new Date(),
            });
            return { success: true };
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Error in reaction: ${err.message}`, err.stack);
            throw new websockets_1.WsException(err.message);
        }
    }
    async handleHandRaise(data, client) {
        const { meetingId, participantId, raised } = data;
        this.logger.log(`[Hand Raise] ${participantId} ${raised ? 'raised' : 'lowered'} hand in meeting ${meetingId}`);
        try {
            if (!this.signalingService.isParticipantInMeeting(meetingId, participantId)) {
                throw new Error('Participant not in meeting');
            }
            const presence = this.signalingService.getParticipant(meetingId, participantId);
            const participantName = presence?.name || 'Unknown';
            this.server.to(meetingId).emit('hand-raise-changed', {
                participantId,
                participantName,
                raised,
                timestamp: new Date(),
            });
            return { success: true };
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Error in hand-raise: ${err.message}`, err.stack);
            throw new websockets_1.WsException(err.message);
        }
    }
};
exports.SignalingGateway = SignalingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], SignalingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join-meeting'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signaling_events_dto_1.JoinMeetingDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], SignalingGateway.prototype, "handleJoinMeeting", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave-meeting'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signaling_events_dto_1.LeaveMeetingDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], SignalingGateway.prototype, "handleLeaveMeeting", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('offer'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signaling_events_dto_1.OfferDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], SignalingGateway.prototype, "handleOffer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('answer'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signaling_events_dto_1.AnswerDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], SignalingGateway.prototype, "handleAnswer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('ice-candidate'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signaling_events_dto_1.IceCandidateDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], SignalingGateway.prototype, "handleIceCandidate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('media-state'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signaling_events_dto_1.MediaStateDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], SignalingGateway.prototype, "handleMediaState", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('meeting-state-sync'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signaling_events_dto_1.MeetingStateSyncDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], SignalingGateway.prototype, "handleMeetingStateSync", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('send-message'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signaling_events_dto_1.SendMessageDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], SignalingGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('reaction'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], SignalingGateway.prototype, "handleReaction", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('hand-raise'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], SignalingGateway.prototype, "handleHandRaise", null);
exports.SignalingGateway = SignalingGateway = SignalingGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            credentials: true,
        },
        namespace: '/signaling',
    }),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __metadata("design:paramtypes", [signaling_service_1.SignalingService,
        audit_service_1.AuditService,
        chat_service_1.ChatService,
        jwt_1.JwtService,
        redis_service_1.RedisService,
        config_1.ConfigService])
], SignalingGateway);
//# sourceMappingURL=signaling.gateway.js.map