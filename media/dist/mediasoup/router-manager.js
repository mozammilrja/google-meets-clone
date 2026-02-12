"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouterManager = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class RouterManager {
    constructor(workerManager) {
        this.workerManager = workerManager;
        this.rooms = new Map();
    }
    async getOrCreateRoom(roomId) {
        let room = this.rooms.get(roomId);
        if (!room) {
            const worker = this.workerManager.getNextWorker();
            const router = await worker.createRouter({
                mediaCodecs: config_1.config.mediasoup.router.mediaCodecs,
            });
            room = {
                id: roomId,
                router,
                participants: new Map(),
                createdAt: new Date(),
            };
            this.rooms.set(roomId, room);
            logger_1.logger.info({ roomId, workerId: worker.pid }, 'Created new room with router');
        }
        return room;
    }
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    async closeRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        for (const participant of room.participants.values()) {
            for (const transport of participant.transports.values()) {
                transport.close();
            }
        }
        room.router.close();
        this.rooms.delete(roomId);
        logger_1.logger.info({ roomId }, 'Room closed and removed');
    }
    addParticipant(roomId, participant) {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error(`Room ${roomId} not found`);
        }
        room.participants.set(participant.id, participant);
        logger_1.logger.info({ roomId, participantId: participant.id, userId: participant.userId }, 'Participant added to room');
    }
    removeParticipant(roomId, participantId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        const participant = room.participants.get(participantId);
        if (participant) {
            for (const transport of participant.transports.values()) {
                transport.close();
            }
            room.participants.delete(participantId);
            logger_1.logger.info({ roomId, participantId }, 'Participant removed from room');
            if (room.participants.size === 0) {
                logger_1.logger.info({ roomId }, 'Room is empty, scheduling cleanup...');
                setTimeout(() => {
                    const currentRoom = this.rooms.get(roomId);
                    if (currentRoom && currentRoom.participants.size === 0) {
                        this.closeRoom(roomId);
                    }
                }, 30000);
            }
        }
    }
    getParticipant(roomId, participantId) {
        const room = this.rooms.get(roomId);
        return room?.participants.get(participantId);
    }
    getRooms() {
        return Array.from(this.rooms.values());
    }
    getRoomStats() {
        return {
            totalRooms: this.rooms.size,
            rooms: Array.from(this.rooms.entries()).map(([id, room]) => ({
                id,
                participantCount: room.participants.size,
                createdAt: room.createdAt,
            })),
        };
    }
}
exports.RouterManager = RouterManager;
//# sourceMappingURL=router-manager.js.map