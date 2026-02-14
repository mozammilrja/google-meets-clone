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
var RedisSignalingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisSignalingService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../redis/redis.service");
const MEETING_PARTICIPANTS_KEY = (meetingId) => `meeting:${meetingId}:participants`;
const SOCKET_MAPPING_KEY = (socketId) => `socket:${socketId}`;
const MEETING_SERVER_KEY = (meetingId) => `meeting:${meetingId}:server`;
const SERVER_MEETINGS_KEY = (instanceId) => `server:${instanceId}:meetings`;
const PRESENCE_TTL = 300;
let RedisSignalingService = RedisSignalingService_1 = class RedisSignalingService {
    constructor(redisService) {
        this.redisService = redisService;
        this.logger = new common_1.Logger(RedisSignalingService_1.name);
        this.instanceId = `backend-${process.env.HOSTNAME || process.pid}-${Date.now()}`;
        this.logger.log(`Initialized RedisSignalingService with instance ID: ${this.instanceId}`);
    }
    async onModuleDestroy() {
        await this.cleanupInstance();
    }
    async addParticipant(presence) {
        const { meetingId, participantId, socketId } = presence;
        const redis = this.redisService.getClient();
        const pipeline = redis.pipeline();
        pipeline.hset(MEETING_PARTICIPANTS_KEY(meetingId), participantId, JSON.stringify(presence));
        pipeline.expire(MEETING_PARTICIPANTS_KEY(meetingId), PRESENCE_TTL);
        pipeline.set(SOCKET_MAPPING_KEY(socketId), JSON.stringify({ meetingId, participantId }), 'EX', PRESENCE_TTL);
        pipeline.set(MEETING_SERVER_KEY(meetingId), this.instanceId, 'EX', PRESENCE_TTL);
        pipeline.sadd(SERVER_MEETINGS_KEY(this.instanceId), meetingId);
        pipeline.expire(SERVER_MEETINGS_KEY(this.instanceId), PRESENCE_TTL);
        await pipeline.exec();
        this.logger.log(`Participant ${participantId} joined meeting ${meetingId} (socket: ${socketId})`);
    }
    async removeParticipant(meetingId, participantId) {
        const redis = this.redisService.getClient();
        const presenceJson = await redis.hget(MEETING_PARTICIPANTS_KEY(meetingId), participantId);
        if (!presenceJson) {
            return null;
        }
        const presence = JSON.parse(presenceJson);
        const pipeline = redis.pipeline();
        pipeline.hdel(MEETING_PARTICIPANTS_KEY(meetingId), participantId);
        pipeline.del(SOCKET_MAPPING_KEY(presence.socketId));
        await pipeline.exec();
        const remainingCount = await redis.hlen(MEETING_PARTICIPANTS_KEY(meetingId));
        if (remainingCount === 0) {
            await this.cleanupEmptyMeeting(meetingId);
        }
        this.logger.log(`Participant ${participantId} left meeting ${meetingId}`);
        return presence;
    }
    async removeParticipantBySocket(socketId) {
        const redis = this.redisService.getClient();
        const mappingJson = await redis.get(SOCKET_MAPPING_KEY(socketId));
        if (!mappingJson) {
            return null;
        }
        const { meetingId, participantId } = JSON.parse(mappingJson);
        return this.removeParticipant(meetingId, participantId);
    }
    async updateMediaState(meetingId, participantId, updates) {
        const redis = this.redisService.getClient();
        const presenceJson = await redis.hget(MEETING_PARTICIPANTS_KEY(meetingId), participantId);
        if (!presenceJson) {
            return null;
        }
        const presence = JSON.parse(presenceJson);
        if (updates.audio !== undefined)
            presence.audio = updates.audio;
        if (updates.video !== undefined)
            presence.video = updates.video;
        if (updates.screenSharing !== undefined)
            presence.screenSharing = updates.screenSharing;
        await redis.hset(MEETING_PARTICIPANTS_KEY(meetingId), participantId, JSON.stringify(presence));
        await redis.expire(MEETING_PARTICIPANTS_KEY(meetingId), PRESENCE_TTL);
        this.logger.log(`Updated media state for ${participantId} in meeting ${meetingId}`);
        return presence;
    }
    async getParticipants(meetingId) {
        const redis = this.redisService.getClient();
        const participantsHash = await redis.hgetall(MEETING_PARTICIPANTS_KEY(meetingId));
        return Object.values(participantsHash).map((json) => JSON.parse(json));
    }
    async getParticipant(meetingId, participantId) {
        const redis = this.redisService.getClient();
        const presenceJson = await redis.hget(MEETING_PARTICIPANTS_KEY(meetingId), participantId);
        return presenceJson ? JSON.parse(presenceJson) : null;
    }
    async getParticipantBySocket(socketId) {
        const redis = this.redisService.getClient();
        const mappingJson = await redis.get(SOCKET_MAPPING_KEY(socketId));
        if (!mappingJson) {
            return null;
        }
        const { meetingId, participantId } = JSON.parse(mappingJson);
        return this.getParticipant(meetingId, participantId);
    }
    async isParticipantInMeeting(meetingId, participantId) {
        const redis = this.redisService.getClient();
        return await redis.hexists(MEETING_PARTICIPANTS_KEY(meetingId), participantId) === 1;
    }
    async getParticipantCount(meetingId) {
        const redis = this.redisService.getClient();
        return await redis.hlen(MEETING_PARTICIPANTS_KEY(meetingId));
    }
    async refreshPresence(meetingId, participantId) {
        const redis = this.redisService.getClient();
        const pipeline = redis.pipeline();
        pipeline.expire(MEETING_PARTICIPANTS_KEY(meetingId), PRESENCE_TTL);
        pipeline.expire(MEETING_SERVER_KEY(meetingId), PRESENCE_TTL);
        const presence = await this.getParticipant(meetingId, participantId);
        if (presence) {
            pipeline.expire(SOCKET_MAPPING_KEY(presence.socketId), PRESENCE_TTL);
        }
        await pipeline.exec();
    }
    async getMeetingServer(meetingId) {
        return await this.redisService.get(MEETING_SERVER_KEY(meetingId));
    }
    async getInstanceMeetings() {
        return await this.redisService.smembers(SERVER_MEETINGS_KEY(this.instanceId));
    }
    async getGlobalStats() {
        const redis = this.redisService.getClient();
        const meetingKeys = [];
        let cursor = '0';
        do {
            const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'meeting:*:participants', 'COUNT', 100);
            cursor = newCursor;
            meetingKeys.push(...keys);
        } while (cursor !== '0');
        let totalParticipants = 0;
        for (const key of meetingKeys) {
            totalParticipants += await redis.hlen(key);
        }
        return {
            totalMeetings: meetingKeys.length,
            totalParticipants,
        };
    }
    async cleanupEmptyMeeting(meetingId) {
        const redis = this.redisService.getClient();
        const pipeline = redis.pipeline();
        pipeline.del(MEETING_PARTICIPANTS_KEY(meetingId));
        pipeline.del(MEETING_SERVER_KEY(meetingId));
        pipeline.srem(SERVER_MEETINGS_KEY(this.instanceId), meetingId);
        await pipeline.exec();
        this.logger.log(`Meeting room ${meetingId} cleaned up`);
    }
    async cleanupInstance() {
        const redis = this.redisService.getClient();
        const meetings = await this.getInstanceMeetings();
        this.logger.log(`Cleaning up ${meetings.length} meetings for instance ${this.instanceId}`);
        for (const meetingId of meetings) {
            await redis.del(MEETING_SERVER_KEY(meetingId));
        }
        await redis.del(SERVER_MEETINGS_KEY(this.instanceId));
        this.logger.log(`Instance ${this.instanceId} cleanup complete`);
    }
    getInstanceId() {
        return this.instanceId;
    }
};
exports.RedisSignalingService = RedisSignalingService;
exports.RedisSignalingService = RedisSignalingService = RedisSignalingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], RedisSignalingService);
//# sourceMappingURL=redis-signaling.service.js.map