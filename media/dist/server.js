"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaServer = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const worker_manager_1 = require("./mediasoup/worker-manager");
const router_manager_1 = require("./mediasoup/router-manager");
const auth_service_1 = require("./services/auth.service");
const recording_service_1 = require("./services/recording.service");
const transport_handler_1 = require("./handlers/transport.handler");
const producer_handler_1 = require("./handlers/producer.handler");
const consumer_handler_1 = require("./handlers/consumer.handler");
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
class MediaServer {
    constructor() {
        this.app = (0, express_1.default)();
        this.httpServer = http_1.default.createServer(this.app);
        this.io = new socket_io_1.Server(this.httpServer, {
            cors: {
                origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
                credentials: true,
                methods: ['GET', 'POST', 'OPTIONS'],
            },
            transports: ['websocket'],
            pingTimeout: 60000,
            pingInterval: 25000,
            allowUpgrades: false,
        });
        logger_1.logger.info({ port: config_1.config.http.port }, 'Socket.IO server configured with websocket-only transport');
        this.workerManager = new worker_manager_1.WorkerManager();
        this.routerManager = new router_manager_1.RouterManager(this.workerManager);
        this.authService = new auth_service_1.AuthService();
        this.recordingService = new recording_service_1.RecordingService();
        this.transportHandler = new transport_handler_1.TransportHandler();
        this.producerHandler = new producer_handler_1.ProducerHandler(this.recordingService);
        this.consumerHandler = new consumer_handler_1.ConsumerHandler();
    }
    async init() {
        await this.workerManager.createWorkers();
        await this.recordingService.ensureRecordingDirectory();
        this.setupSocketHandlers();
        this.setupHttpRoutes();
        logger_1.logger.info('Media server initialized');
    }
    setupHttpRoutes() {
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date() });
        });
        this.app.get('/stats', (req, res) => {
            const stats = {
                workers: this.workerManager.getWorkers().length,
                rooms: this.routerManager.getRoomStats(),
            };
            res.json(stats);
        });
    }
    setupSocketHandlers() {
        this.io.engine.on('connection_error', (err) => {
            logger_1.logger.error({ code: err.code, message: err.message, context: err.context }, 'Socket.IO engine connection error');
        });
        this.io.engine.on('initial_headers', (headers, req) => {
            logger_1.logger.info({ url: req.url, origin: req.headers.origin }, 'Initial headers');
        });
        this.io.on('connection', async (socket) => {
            logger_1.logger.info({ socketId: socket.id, transport: socket.conn.transport.name }, 'Client connected via ' + socket.conn.transport.name);
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
                    logger_1.logger.warn({ socketId: socket.id, error: error instanceof Error ? error.message : String(error) }, 'Authentication failed');
                    socket.emit('error', { message: error instanceof Error ? error.message : 'Authentication failed' });
                    socket.disconnect();
                    return;
                }
            }
            socket.on('getRouterRtpCapabilities', async (data, callback) => {
                try {
                    const roomId = data?.roomId || 'default-room';
                    logger_1.logger.info({ socketId: socket.id, roomId }, 'Getting router RTP capabilities');
                    const room = await this.routerManager.getOrCreateRoom(roomId);
                    callback({
                        success: true,
                        rtpCapabilities: room.router.rtpCapabilities,
                    });
                }
                catch (error) {
                    logger_1.logger.error({ error: error instanceof Error ? error.message : String(error) }, 'getRouterRtpCapabilities failed');
                    callback({ success: false, error: error instanceof Error ? error.message : 'Failed to get RTP capabilities' });
                }
            });
            socket.on('joinRoom', async ({ roomId, participantId }, callback) => {
                try {
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
                    socket.to(roomId).emit('participantJoined', {
                        participantId,
                        userId: socket.data.userId,
                    });
                    callback({ success: true });
                }
                catch (error) {
                    logger_1.logger.error({ error }, 'joinRoom failed');
                    callback({ success: false, error: getErrorMessage(error) });
                }
            });
            socket.on('createTransport', async ({ roomId, participantId, direction }, callback) => {
                try {
                    const room = this.routerManager.getRoom(roomId);
                    if (!room) {
                        throw new Error('Room not found');
                    }
                    const transport = await this.transportHandler.createTransport(room.router, participantId, direction);
                    const participant = this.routerManager.getParticipant(roomId, participantId);
                    if (participant) {
                        participant.transports.set(transport.id, transport);
                        transport.appData.router = room.router;
                    }
                    callback({
                        success: true,
                        transport: {
                            id: transport.id,
                            iceParameters: transport.iceParameters,
                            iceCandidates: transport.iceCandidates,
                            dtlsParameters: transport.dtlsParameters,
                        },
                    });
                }
                catch (error) {
                    logger_1.logger.error({ error }, 'createTransport failed');
                    callback({ success: false, error: getErrorMessage(error) });
                }
            });
            socket.on('connectTransport', async ({ transportId, dtlsParameters }, callback) => {
                try {
                    const { roomId, participantId } = socket.data;
                    const participant = this.routerManager.getParticipant(roomId, participantId);
                    if (!participant) {
                        throw new Error('Participant not found');
                    }
                    const transport = participant.transports.get(transportId);
                    if (!transport) {
                        throw new Error('Transport not found');
                    }
                    await this.transportHandler.connectTransport(transport, dtlsParameters);
                    callback({ success: true });
                }
                catch (error) {
                    logger_1.logger.error({ error }, 'connectTransport failed');
                    callback({ success: false, error: getErrorMessage(error) });
                }
            });
            socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
                try {
                    const { roomId, participantId, userId } = socket.data;
                    const participant = this.routerManager.getParticipant(roomId, participantId);
                    if (!participant) {
                        throw new Error('Participant not found');
                    }
                    const transport = participant.transports.get(transportId);
                    if (!transport) {
                        throw new Error('Transport not found');
                    }
                    const producer = await this.producerHandler.createProducer(transport, kind, rtpParameters, participantId, roomId, userId, appData);
                    participant.producers.set(producer.id, producer);
                    socket.to(roomId).emit('newProducer', {
                        participantId,
                        producerId: producer.id,
                        kind,
                        appData,
                    });
                    callback({ success: true, producerId: producer.id });
                }
                catch (error) {
                    logger_1.logger.error({ error }, 'produce failed');
                    callback({ success: false, error: getErrorMessage(error) });
                }
            });
            socket.on('consume', async ({ producerId, rtpCapabilities }, callback) => {
                try {
                    const { roomId, participantId } = socket.data;
                    const participant = this.routerManager.getParticipant(roomId, participantId);
                    const room = this.routerManager.getRoom(roomId);
                    if (!participant || !room) {
                        throw new Error('Participant or room not found');
                    }
                    let producer = null;
                    for (const p of room.participants.values()) {
                        producer = p.producers.get(producerId);
                        if (producer)
                            break;
                    }
                    if (!producer) {
                        throw new Error('Producer not found');
                    }
                    const recvTransport = Array.from(participant.transports.values()).find((t) => !t.appData.direction || t.appData.direction === 'recv');
                    if (!recvTransport) {
                        throw new Error('Receive transport not found');
                    }
                    const consumer = await this.consumerHandler.createConsumer(recvTransport, producer, rtpCapabilities, participantId);
                    if (!consumer) {
                        throw new Error('Cannot consume this producer');
                    }
                    participant.consumers.set(consumer.id, consumer);
                    callback({
                        success: true,
                        consumer: {
                            id: consumer.id,
                            producerId: consumer.producerId,
                            kind: consumer.kind,
                            rtpParameters: consumer.rtpParameters,
                        },
                    });
                }
                catch (error) {
                    logger_1.logger.error({ error }, 'consume failed');
                    callback({ success: false, error: getErrorMessage(error) });
                }
            });
            socket.on('resumeConsumer', async ({ consumerId }, callback) => {
                try {
                    const { roomId, participantId } = socket.data;
                    const participant = this.routerManager.getParticipant(roomId, participantId);
                    if (!participant) {
                        throw new Error('Participant not found');
                    }
                    const consumer = participant.consumers.get(consumerId);
                    if (!consumer) {
                        throw new Error('Consumer not found');
                    }
                    await this.consumerHandler.resumeConsumer(consumer);
                    callback({ success: true });
                }
                catch (error) {
                    logger_1.logger.error({ error }, 'resumeConsumer failed');
                    callback({ success: false, error: getErrorMessage(error) });
                }
            });
            socket.on('closeProducer', async ({ producerId }, callback) => {
                try {
                    const { roomId, participantId } = socket.data;
                    const participant = this.routerManager.getParticipant(roomId, participantId);
                    if (!participant) {
                        throw new Error('Participant not found');
                    }
                    const producer = participant.producers.get(producerId);
                    if (!producer) {
                        throw new Error('Producer not found');
                    }
                    await this.producerHandler.closeProducer(producer);
                    participant.producers.delete(producerId);
                    socket.to(roomId).emit('producerClosed', { participantId, producerId });
                    callback({ success: true });
                }
                catch (error) {
                    logger_1.logger.error({ error }, 'closeProducer failed');
                    callback({ success: false, error: getErrorMessage(error) });
                }
            });
            socket.on('disconnect', async () => {
                const { roomId, participantId } = socket.data;
                logger_1.logger.info({ socketId: socket.id, roomId, participantId }, 'Client disconnected');
                if (roomId && participantId) {
                    this.routerManager.removeParticipant(roomId, participantId);
                    socket.to(roomId).emit('participantLeft', { participantId });
                }
            });
        });
    }
    async start() {
        await this.init();
        this.httpServer.listen(config_1.config.http.port, () => {
            logger_1.logger.info({
                port: config_1.config.http.port,
                workers: this.workerManager.getWorkers().length,
            }, 'Media server listening');
        });
    }
    async stop() {
        logger_1.logger.info('Shutting down media server...');
        this.io.close();
        await this.workerManager.closeAll();
        this.httpServer.close(() => {
            logger_1.logger.info('Media server stopped');
        });
    }
}
exports.MediaServer = MediaServer;
//# sourceMappingURL=server.js.map