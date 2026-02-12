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
exports.MediaGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const router_manager_1 = require("./mediasoup/router-manager");
const auth_service_1 = require("./services/auth.service");
const transport_handler_1 = require("./handlers/transport.handler");
const producer_handler_1 = require("./handlers/producer.handler");
const consumer_handler_1 = require("./handlers/consumer.handler");
const logger_1 = require("./utils/logger");
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
let MediaGateway = class MediaGateway {
    constructor(routerManager, authService, transportHandler, producerHandler, consumerHandler) {
        this.routerManager = routerManager;
        this.authService = authService;
        this.transportHandler = transportHandler;
        this.producerHandler = producerHandler;
        this.consumerHandler = consumerHandler;
    }
    async handleConnection(socket) {
        logger_1.logger.info({ socketId: socket.id, transport: socket.conn?.transport?.name }, 'Client connected');
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) {
            logger_1.logger.warn({ socketId: socket.id }, 'Connection allowed without token (testing mode)');
            socket.data.userId = 'test-user';
            socket.data.email = 'test@localhost';
        }
        else {
            try {
                logger_1.logger.info({ socketId: socket.id, tokenLength: token.length }, 'Verifying token...');
                const payload = this.authService.verifyToken(token);
                socket.data.userId = payload.sub;
                socket.data.email = payload.email;
                logger_1.logger.info({ socketId: socket.id, userId: payload.sub, email: payload.email }, 'Client authenticated');
            }
            catch (error) {
                logger_1.logger.warn({ socketId: socket.id, error: getErrorMessage(error) }, 'Authentication failed');
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
            this.routerManager.removeParticipant(roomId, participantId);
            socket.to(roomId).emit('participantLeft', { participantId });
        }
    }
    async handleGetRouterRtpCapabilities(socket, data) {
        try {
            const roomId = data?.roomId || 'default-room';
            logger_1.logger.info({ socketId: socket.id, roomId }, 'Getting router RTP capabilities');
            const room = await this.routerManager.getOrCreateRoom(roomId);
            return { success: true, rtpCapabilities: room.router.rtpCapabilities };
        }
        catch (error) {
            logger_1.logger.error({ error: getErrorMessage(error) }, 'getRouterRtpCapabilities failed');
            return { success: false, error: getErrorMessage(error) };
        }
    }
    async handleJoinRoom(socket, data) {
        try {
            const { roomId, participantId } = data;
            const room = await this.routerManager.getOrCreateRoom(roomId);
            const participant = {
                id: participantId,
                userId: socket.data.userId,
                socketId: socket.id,
                transports: new Map(),
                producers: new Map(),
                consumers: new Map(),
                joinedAt: new Date(),
            };
            this.routerManager.addParticipant(roomId, participant);
            socket.data.roomId = roomId;
            socket.data.participantId = participantId;
            await socket.join(roomId);
            socket.to(roomId).emit('participantJoined', { participantId, userId: socket.data.userId });
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'joinRoom failed');
            return { success: false, error: getErrorMessage(error) };
        }
    }
    async handleCreateTransport(socket, data) {
        try {
            const { roomId, participantId, direction } = data;
            const room = this.routerManager.getRoom(roomId);
            if (!room)
                throw new Error('Room not found');
            const transport = await this.transportHandler.createTransport(room.router, participantId, direction);
            const participant = this.routerManager.getParticipant(roomId, participantId);
            if (participant) {
                participant.transports.set(transport.id, transport);
                transport.appData.router = room.router;
            }
            return {
                success: true,
                transport: {
                    id: transport.id,
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters,
                },
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'createTransport failed');
            return { success: false, error: getErrorMessage(error) };
        }
    }
    async handleConnectTransport(socket, data) {
        try {
            const { transportId, dtlsParameters } = data;
            const { roomId, participantId } = socket.data;
            const participant = this.routerManager.getParticipant(roomId, participantId);
            if (!participant)
                throw new Error('Participant not found');
            const transport = participant.transports.get(transportId);
            if (!transport)
                throw new Error('Transport not found');
            await this.transportHandler.connectTransport(transport, dtlsParameters);
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'connectTransport failed');
            return { success: false, error: getErrorMessage(error) };
        }
    }
    async handleProduce(socket, data) {
        try {
            const { transportId, kind, rtpParameters, appData } = data;
            const { roomId, participantId, userId } = socket.data;
            const participant = this.routerManager.getParticipant(roomId, participantId);
            if (!participant)
                throw new Error('Participant not found');
            const transport = participant.transports.get(transportId);
            if (!transport)
                throw new Error('Transport not found');
            const producer = await this.producerHandler.createProducer(transport, kind, rtpParameters, participantId, roomId, userId, appData);
            participant.producers.set(producer.id, producer);
            socket.to(roomId).emit('newProducer', { participantId, producerId: producer.id, kind, appData });
            return { success: true, producerId: producer.id };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'produce failed');
            return { success: false, error: getErrorMessage(error) };
        }
    }
    async handleConsume(socket, data) {
        try {
            const { producerId, rtpCapabilities } = data;
            const { roomId, participantId } = socket.data;
            const participant = this.routerManager.getParticipant(roomId, participantId);
            const room = this.routerManager.getRoom(roomId);
            if (!participant || !room)
                throw new Error('Participant or room not found');
            let producer = null;
            for (const p of room.participants.values()) {
                producer = p.producers.get(producerId);
                if (producer)
                    break;
            }
            if (!producer)
                throw new Error('Producer not found');
            const recvTransport = Array.from(participant.transports.values()).find((t) => !t.appData.direction || t.appData.direction === 'recv');
            if (!recvTransport)
                throw new Error('Receive transport not found');
            const consumer = await this.consumerHandler.createConsumer(recvTransport, producer, rtpCapabilities, participantId);
            if (!consumer)
                throw new Error('Cannot consume this producer');
            participant.consumers.set(consumer.id, consumer);
            return {
                success: true,
                consumer: {
                    id: consumer.id,
                    producerId: consumer.producerId,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters,
                },
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'consume failed');
            return { success: false, error: getErrorMessage(error) };
        }
    }
    async handleResumeConsumer(socket, data) {
        try {
            const { consumerId } = data;
            const { roomId, participantId } = socket.data;
            const participant = this.routerManager.getParticipant(roomId, participantId);
            if (!participant)
                throw new Error('Participant not found');
            const consumer = participant.consumers.get(consumerId);
            if (!consumer)
                throw new Error('Consumer not found');
            await this.consumerHandler.resumeConsumer(consumer);
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'resumeConsumer failed');
            return { success: false, error: getErrorMessage(error) };
        }
    }
    async handleCloseProducer(socket, data) {
        try {
            const { producerId } = data;
            const { roomId, participantId } = socket.data;
            const participant = this.routerManager.getParticipant(roomId, participantId);
            if (!participant)
                throw new Error('Participant not found');
            const producer = participant.producers.get(producerId);
            if (!producer)
                throw new Error('Producer not found');
            await this.producerHandler.closeProducer(producer);
            participant.producers.delete(producerId);
            socket.to(roomId).emit('producerClosed', { participantId, producerId });
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'closeProducer failed');
            return { success: false, error: getErrorMessage(error) };
        }
    }
};
exports.MediaGateway = MediaGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], MediaGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('getRouterRtpCapabilities'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MediaGateway.prototype, "handleGetRouterRtpCapabilities", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinRoom'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MediaGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('createTransport'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MediaGateway.prototype, "handleCreateTransport", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('connectTransport'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MediaGateway.prototype, "handleConnectTransport", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('produce'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MediaGateway.prototype, "handleProduce", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('consume'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MediaGateway.prototype, "handleConsume", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('resumeConsumer'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MediaGateway.prototype, "handleResumeConsumer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('closeProducer'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MediaGateway.prototype, "handleCloseProducer", null);
exports.MediaGateway = MediaGateway = __decorate([
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
    __metadata("design:paramtypes", [router_manager_1.RouterManager,
        auth_service_1.AuthService,
        transport_handler_1.TransportHandler,
        producer_handler_1.ProducerHandler,
        consumer_handler_1.ConsumerHandler])
], MediaGateway);
//# sourceMappingURL=media.gateway.js.map