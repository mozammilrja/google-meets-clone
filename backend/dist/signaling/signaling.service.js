"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SignalingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalingService = void 0;
const common_1 = require("@nestjs/common");
let SignalingService = SignalingService_1 = class SignalingService {
    constructor() {
        this.logger = new common_1.Logger(SignalingService_1.name);
        this.rooms = new Map();
        this.socketToPresence = new Map();
    }
    addParticipant(presence) {
        const { meetingId, participantId, socketId } = presence;
        if (!this.rooms.has(meetingId)) {
            this.rooms.set(meetingId, {
                meetingId,
                participants: new Map(),
            });
        }
        const room = this.rooms.get(meetingId);
        room.participants.set(participantId, presence);
        this.socketToPresence.set(socketId, presence);
        this.logger.log(`Participant ${participantId} joined meeting ${meetingId} (socket: ${socketId})`);
    }
    removeParticipant(meetingId, participantId) {
        const room = this.rooms.get(meetingId);
        if (!room) {
            return null;
        }
        const presence = room.participants.get(participantId);
        if (!presence) {
            return null;
        }
        room.participants.delete(participantId);
        this.socketToPresence.delete(presence.socketId);
        if (room.participants.size === 0) {
            this.rooms.delete(meetingId);
            this.logger.log(`Meeting room ${meetingId} is now empty and removed`);
        }
        this.logger.log(`Participant ${participantId} left meeting ${meetingId}`);
        return presence;
    }
    removeParticipantBySocket(socketId) {
        const presence = this.socketToPresence.get(socketId);
        if (!presence) {
            return null;
        }
        return this.removeParticipant(presence.meetingId, presence.participantId);
    }
    updateMediaState(meetingId, participantId, updates) {
        const room = this.rooms.get(meetingId);
        if (!room) {
            return null;
        }
        const presence = room.participants.get(participantId);
        if (!presence) {
            return null;
        }
        if (updates.audio !== undefined)
            presence.audio = updates.audio;
        if (updates.video !== undefined)
            presence.video = updates.video;
        if (updates.screenSharing !== undefined)
            presence.screenSharing = updates.screenSharing;
        this.logger.log(`Updated media state for ${participantId} in meeting ${meetingId}`);
        return presence;
    }
    getParticipants(meetingId) {
        const room = this.rooms.get(meetingId);
        if (!room) {
            return [];
        }
        return Array.from(room.participants.values());
    }
    getParticipant(meetingId, participantId) {
        const room = this.rooms.get(meetingId);
        if (!room) {
            return null;
        }
        return room.participants.get(participantId) || null;
    }
    getParticipantBySocket(socketId) {
        return this.socketToPresence.get(socketId) || null;
    }
    isParticipantInMeeting(meetingId, participantId) {
        const room = this.rooms.get(meetingId);
        return room ? room.participants.has(participantId) : false;
    }
    getParticipantCount(meetingId) {
        const room = this.rooms.get(meetingId);
        return room ? room.participants.size : 0;
    }
};
exports.SignalingService = SignalingService;
exports.SignalingService = SignalingService = SignalingService_1 = __decorate([
    (0, common_1.Injectable)()
], SignalingService);
//# sourceMappingURL=signaling.service.js.map