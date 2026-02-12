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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediasoupGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const room_service_1 = require("../services/room.service");
const auth_service_1 = require("../services/auth.service");
const logger_1 = require("../utils/logger");
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
let MediasoupGateway = class MediasoupGateway {
    constructor(roomService, authService) {
        this.roomService = roomService;
        this.authService = authService;
    }
    async handleConnection(socket) {
        logger_1.logger.info({ socketId: socket.id }, 'Client connected');
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) {
            logger_1.logger.warn({ socketId: socket.id }, 'Connection allowed without token (testing mode)');
            socket.data.userId = `test-user-${socket.id}`;
            socket.data.email = 'test@localhost';
        }
        else {
            try {
                const payload = this.authService.verifyToken(token);
                socket.data.userId = payload.sub;
                socket.data.email = payload.email;
                logger_1.logger.info({ socketId: socket.id, userId: payload.sub }, 'Client authenticated');
            }
            catch (error) {
                logger_1.logger.warn({ socketId: socket.id, error: getErrorMessage(error) }, 'Auth failed');
                socket.emit('error', { message: getErrorMessage(error) });
                socket.disconnect();
                return;
            }
        }
    }
    async handleDisconnect(socket) {
        const { roomId, participantId } = socket.data;
        logger_1.logger.info({ socketId: socket.id, roomId, participantId }, 'Client disconnected');
        if (roomId && participantId) {
            this.roomService.removePeer(roomId, participantId);
            socket.to(roomId).emit('participantLeft', { participantId });
        }
    }
    async handleJoinRoom(socket, data) {
        try {
            const { roomId, participantId } = data;
            logger_1.logger.info({
                socketId: socket.id,
                roomId,
                participantId,
                socketConnected: socket.connected,
            }, 'Peer joining room');
            const room = await this.roomService.getOrCreateRoom(roomId);
            await this.roomService.addPeer(roomId, participantId, socket.data.userId, socket.id);
            socket.data.roomId = roomId;
            socket.data.participantId = participantId;
            logger_1.logger.info({
                socketId: socket.id,
                storedRoomId: socket.data.roomId,
                storedParticipantId: socket.data.participantId,
            }, 'Socket data stored after join');
            await socket.join(roomId);
            socket.to(roomId).emit('participantJoined', {
                participantId,
                userId: socket.data.userId,
            });
            const existingProducers = this.roomService.getOtherProducers(roomId, participantId);
            logger_1.logger.info({ roomId, participantId, existingProducers: existingProducers.length }, 'Peer joined');
            return {
                success: true,
                rtpCapabilities: room.router.rtpCapabilities,
                existingProducers,
            };
        }
        catch (error) {
            logger_1.logger.error({ error: getErrorMessage(error) }, 'joinRoom failed');
            return { success: false, error: getErrorMessage(error) };
        }
    }
    async handleGetRouterRtpCapabilities(socket, data) {
        try {
            const roomId = data?.roomId || socket.data.roomId || 'default-room';
            logger_1.logger.info({ socketId: socket.id, roomId }, 'Getting RTP capabilities');
            const room = await this.roomService.getOrCreateRoom(roomId);
            return {
                success: true,
                rtpCapabilities: room.router.rtpCapabilities,
            };
        }
        catch (error) {
            logger_1.logger.error({ error: getErrorMessage(error) }, 'getRouterRtpCapabilities failed');
            return { success: false, error: getErrorMessage(error) };
        }
    }
    async handleCreateTransport(socket, data) {
        try {
            const roomId = data.roomId || socket.data.roomId;
            const participantId = data.participantId || socket.data.participantId;
            const { direction } = data;
            if (!roomId) {
                const defaultRoomId = `room-${socket.id}`;
                socket.data.roomId = defaultRoomId;
                socket.data.participantId = socket.data.userId;
                logger_1.logger.warn({ socketId: socket.id }, 'No roomId, creating default room');
                await this.roomService.getOrCreateRoom(defaultRoomId);
                await this.roomService.addPeer(defaultRoomId, socket.data.userId, socket.data.userId, socket.id);
            }
            const finalRoomId = roomId || socket.data.roomId;
            const finalParticipantId = participantId || socket.data.participantId;
            logger_1.logger.info({ roomId: finalRoomId, participantId: finalParticipantId, direction }, 'Creating transport');
            const transport = await this.roomService.createTransport(finalRoomId, finalParticipantId, direction);
            return {
                success: true,
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
            };
        }
        catch (error) {
            logger_1.logger.error({ error: getErrorMessage(error) }, 'createTransport failed');
            return { success: false, error: getErrorMessage(error) };
        }
    }
    async handleConnectTransport(socket, data) {
        try {
            const { transportId, dtlsParameters } = data;
            const roomId = socket.data.roomId;
            const participantId = socket.data.participantId;
            logger_1.logger.info({
                socketId: socket.id,
                transportId,
                roomId,
                participantId,
                hasRoomId: !!roomId,
                hasParticipantId: !!participantId,
                socketDataKeys: Object.keys(socket.data),
            }, 'connectTransport called - checking socket.data');
            if (!roomId || !participantId) {
                logger_1.logger.error({
                    socketId: socket.id,
                    roomId,
                    participantId,
                }, 'Not joined to a room - socket.data missing');
                throw new Error('Not joined to a room. Call joinRoom first.');
            }
            logger_1.logger.info({ roomId, participantId, transportId }, 'Connecting transport');
            await this.roomService.connectTransport(roomId, participantId, transportId, dtlsParameters);
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error({ error: getErrorMessage(error) }, 'connectTransport failed');
            return { success: false, error: getErrorMessage(error) };
        }
    }
    async handleProduce(socket, data) {
        try {
            const { transportId, kind, rtpParameters, appData } = data;
            const roomId = socket.data.roomId;
            const participantId = socket.data.participantId;
            logger_1.logger.info({
                socketId: socket.id,
                roomId,
                participantId,
                hasRoomId: !!roomId,
                socketData: socket.data,
            }, 'Produce request received');
            if (!roomId || !participantId) {
                logger_1.logger.error({
                    socketId: socket.id,
                    socketData: socket.data,
                }, 'Produce failed: socket not in room');
                throw new Error('Not joined to a room. Call joinRoom first.');
            }
            logger_1.logger.info({ roomId, participantId, transportId, kind }, 'Creating producer');
            const producer = await this.roomService.createProducer(roomId, participantId, transportId, kind, rtpParameters, appData);
            socket.to(roomId).emit('newProducer', {
                participantId,
                producerId: producer.id,
                kind,
                appData,
            });
            return { success: true, producerId: producer.id };
        }
        catch (error) {
            logger_1.logger.error({ error: getErrorMessage(error) }, 'produce failed');
            return { success: false, error: getErrorMessage(error) };
        }
    }
    async handleConsume(socket, data) {
        try {
            const { producerId, rtpCapabilities } = data;
            const roomId = socket.data.roomId;
            const participantId = socket.data.participantId;
            if (!roomId || !participantId) {
                throw new Error('Not joined to a room. Call joinRoom first.');
            }
            logger_1.logger.info({ roomId, participantId, producerId }, 'Creating consumer');
            const consumer = await this.roomService.createConsumer(roomId, participantId, producerId, rtpCapabilities);
            if (!consumer) {
                return { success: false, error: 'Cannot consume this producer' };
            }
            return {
                success: true,
                id: consumer.id,
                producerId: consumer.producerId,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
            };
        }
        catch (error) {
            logger_1.logger.error({ error: getErrorMessage(error) }, 'consume failed');
            return { success: false, error: getErrorMessage(error) };
        }
    }
    async handleResumeConsumer(socket, data) {
        try {
            const { consumerId } = data;
            const roomId = socket.data.roomId;
            const participantId = socket.data.participantId;
            if (!roomId || !participantId) {
                throw new Error('Not joined to a room. Call joinRoom first.');
            }
            await this.roomService.resumeConsumer(roomId, participantId, consumerId);
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error({ error: getErrorMessage(error) }, 'resumeConsumer failed');
            return { success: false, error: getErrorMessage(error) };
        }
    }
    async handleCloseProducer(socket, data) {
        try {
            const { producerId } = data;
            const roomId = socket.data.roomId;
            const participantId = socket.data.participantId;
            if (!roomId || !participantId) {
                throw new Error('Not joined to a room. Call joinRoom first.');
            }
            this.roomService.closeProducer(roomId, participantId, producerId);
            socket.to(roomId).emit('producerClosed', { participantId, producerId });
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error({ error: getErrorMessage(error) }, 'closeProducer failed');
            return { success: false, error: getErrorMessage(error) };
        }
    }
    async handleGetStats() {
        try {
            const stats = this.roomService.getStats();
            return { success: true, stats };
        }
        catch (error) {
            return { success: false, error: getErrorMessage(error) };
        }
    }
};
exports.MediasoupGateway = MediasoupGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], MediasoupGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinRoom'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MediasoupGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('getRouterRtpCapabilities'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MediasoupGateway.prototype, "handleGetRouterRtpCapabilities", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('createTransport'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MediasoupGateway.prototype, "handleCreateTransport", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('connectTransport'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MediasoupGateway.prototype, "handleConnectTransport", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('produce'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MediasoupGateway.prototype, "handleProduce", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('consume'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MediasoupGateway.prototype, "handleConsume", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('resumeConsumer'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MediasoupGateway.prototype, "handleResumeConsumer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('closeProducer'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MediasoupGateway.prototype, "handleCloseProducer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('getStats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MediasoupGateway.prototype, "handleGetStats", null);
exports.MediasoupGateway = MediasoupGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
            credentials: true,
            methods: ['GET', 'POST', 'OPTIONS'],
        },
        transports: ['websocket'],
        pingTimeout: 60000,
        pingInterval: 25000,
        allowUpgrades: false,
    }),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [room_service_1.RoomService,
        auth_service_1.AuthService])
], MediasoupGateway);
//# sourceMappingURL=mediasoup.gateway.js.map