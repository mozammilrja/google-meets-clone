"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomService = void 0;
const common_1 = require("@nestjs/common");
const mediasoup = __importStar(require("mediasoup"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
let RoomService = class RoomService {
    constructor() {
        this.workers = [];
        this.nextWorkerIdx = 0;
        this.rooms = new Map();
    }
    async onModuleInit() {
        await this.createWorkers();
    }
    async createWorkers() {
        const { numWorkers, worker: workerSettings } = config_1.config.mediasoup;
        logger_1.logger.info({ numWorkers }, 'Creating mediasoup workers...');
        for (let i = 0; i < numWorkers; i++) {
            const worker = await mediasoup.createWorker({
                logLevel: workerSettings.logLevel,
                logTags: workerSettings.logTags,
                rtcMinPort: workerSettings.rtcMinPort,
                rtcMaxPort: workerSettings.rtcMaxPort,
            });
            worker.on('died', (error) => {
                logger_1.logger.error({ workerId: i, error }, 'Mediasoup worker died, restarting...');
                this.workers = this.workers.filter((w) => w !== worker);
                this.createWorkers();
            });
            this.workers.push(worker);
            logger_1.logger.info({ workerId: i, pid: worker.pid }, 'Mediasoup worker created');
        }
        logger_1.logger.info({ count: this.workers.length }, 'All mediasoup workers created');
    }
    getNextWorker() {
        const worker = this.workers[this.nextWorkerIdx];
        this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
        return worker;
    }
    async getOrCreateRoom(roomId) {
        let room = this.rooms.get(roomId);
        if (!room) {
            const worker = this.getNextWorker();
            const router = await worker.createRouter({
                mediaCodecs: config_1.config.mediasoup.router.mediaCodecs,
            });
            room = {
                id: roomId,
                router,
                peers: new Map(),
                createdAt: new Date(),
            };
            this.rooms.set(roomId, room);
            logger_1.logger.info({ roomId, workerId: worker.pid }, 'Room created with router');
        }
        return room;
    }
    async getRoom(roomId) {
        return this.getOrCreateRoom(roomId);
    }
    async addPeer(roomId, peerId, userId, socketId) {
        const room = await this.getOrCreateRoom(roomId);
        const peer = {
            id: peerId,
            userId,
            socketId,
            transports: new Map(),
            producers: new Map(),
            consumers: new Map(),
            joinedAt: new Date(),
        };
        room.peers.set(peerId, peer);
        logger_1.logger.info({ roomId, peerId, userId }, 'Peer joined room');
        return peer;
    }
    getPeer(roomId, peerId) {
        const room = this.rooms.get(roomId);
        return room?.peers.get(peerId);
    }
    removePeer(roomId, peerId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        const peer = room.peers.get(peerId);
        if (!peer)
            return;
        for (const consumer of peer.consumers.values()) {
            consumer.close();
        }
        for (const producer of peer.producers.values()) {
            producer.close();
        }
        for (const transport of peer.transports.values()) {
            transport.close();
        }
        room.peers.delete(peerId);
        logger_1.logger.info({ roomId, peerId }, 'Peer removed from room');
        if (room.peers.size === 0) {
            room.router.close();
            this.rooms.delete(roomId);
            logger_1.logger.info({ roomId }, 'Empty room closed');
        }
    }
    async createTransport(roomId, peerId, direction) {
        const room = await this.getOrCreateRoom(roomId);
        let peer = room.peers.get(peerId);
        if (!peer) {
            peer = {
                id: peerId,
                userId: 'reconnected-user',
                socketId: '',
                transports: new Map(),
                producers: new Map(),
                consumers: new Map(),
                joinedAt: new Date(),
            };
            room.peers.set(peerId, peer);
            logger_1.logger.info({ roomId, peerId }, 'Peer auto-created during transport creation');
        }
        const transport = await room.router.createWebRtcTransport({
            listenIps: config_1.config.mediasoup.webRtcTransport.listenIps,
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate: config_1.config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
            appData: { direction, peerId },
        });
        if (direction === 'recv') {
            await transport.setMaxIncomingBitrate(config_1.config.mediasoup.webRtcTransport.maxIncomingBitrate);
        }
        peer.transports.set(transport.id, transport);
        logger_1.logger.info({ roomId, peerId, transportId: transport.id, direction }, 'Transport created');
        return transport;
    }
    async connectTransport(roomId, peerId, transportId, dtlsParameters) {
        const room = await this.getOrCreateRoom(roomId);
        const peer = room.peers.get(peerId);
        if (!peer) {
            throw new Error('Peer not found');
        }
        const transport = peer.transports.get(transportId);
        if (!transport) {
            throw new Error('Transport not found');
        }
        await transport.connect({ dtlsParameters });
        logger_1.logger.info({ roomId, peerId, transportId }, 'Transport connected');
    }
    async createProducer(roomId, peerId, transportId, kind, rtpParameters, appData) {
        const room = await this.getOrCreateRoom(roomId);
        const peer = room.peers.get(peerId);
        if (!peer) {
            throw new Error('Peer not found');
        }
        const transport = peer.transports.get(transportId);
        if (!transport) {
            throw new Error('Transport not found');
        }
        const producer = await transport.produce({
            kind,
            rtpParameters,
            appData: { ...appData, peerId },
        });
        peer.producers.set(producer.id, producer);
        logger_1.logger.info({ roomId, peerId, producerId: producer.id, kind }, 'Producer created');
        return producer;
    }
    async createConsumer(roomId, peerId, producerId, rtpCapabilities) {
        const room = await this.getOrCreateRoom(roomId);
        const peer = room.peers.get(peerId);
        if (!peer) {
            throw new Error('Peer not found');
        }
        let producer;
        for (const p of room.peers.values()) {
            producer = p.producers.get(producerId);
            if (producer)
                break;
        }
        if (!producer) {
            throw new Error('Producer not found');
        }
        if (!room.router.canConsume({ producerId, rtpCapabilities })) {
            logger_1.logger.warn({ producerId, peerId }, 'Cannot consume producer');
            return null;
        }
        const recvTransport = Array.from(peer.transports.values()).find((t) => t.appData.direction === 'recv');
        if (!recvTransport) {
            throw new Error('Recv transport not found');
        }
        const consumer = await recvTransport.consume({
            producerId,
            rtpCapabilities,
            paused: true,
        });
        peer.consumers.set(consumer.id, consumer);
        logger_1.logger.info({ roomId, peerId, consumerId: consumer.id, producerId }, 'Consumer created');
        return consumer;
    }
    async resumeConsumer(roomId, peerId, consumerId) {
        const peer = this.getPeer(roomId, peerId);
        if (!peer)
            throw new Error('Peer not found');
        const consumer = peer.consumers.get(consumerId);
        if (!consumer)
            throw new Error('Consumer not found');
        await consumer.resume();
        logger_1.logger.info({ consumerId }, 'Consumer resumed');
    }
    closeProducer(roomId, peerId, producerId) {
        const peer = this.getPeer(roomId, peerId);
        if (!peer)
            return;
        const producer = peer.producers.get(producerId);
        if (producer) {
            producer.close();
            peer.producers.delete(producerId);
            logger_1.logger.info({ producerId }, 'Producer closed');
        }
    }
    getOtherProducers(roomId, excludePeerId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return [];
        const producers = [];
        for (const [peerId, peer] of room.peers) {
            if (peerId === excludePeerId)
                continue;
            for (const [producerId, producer] of peer.producers) {
                producers.push({
                    peerId,
                    producerId,
                    kind: producer.kind,
                });
            }
        }
        return producers;
    }
    getStats() {
        let peers = 0;
        for (const room of this.rooms.values()) {
            peers += room.peers.size;
        }
        return {
            rooms: this.rooms.size,
            peers,
            workers: this.workers.length,
        };
    }
};
exports.RoomService = RoomService;
exports.RoomService = RoomService = __decorate([
    (0, common_1.Injectable)()
], RoomService);
//# sourceMappingURL=room.service.js.map