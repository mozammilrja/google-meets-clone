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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../redis/redis.service");
const redis_signaling_service_1 = require("../signaling/redis-signaling.service");
let HealthController = class HealthController {
    constructor(redisService, signalingService) {
        this.redisService = redisService;
        this.signalingService = signalingService;
        this.startTime = Date.now();
    }
    async liveness() {
        return { status: 'alive' };
    }
    async readiness() {
        const redisReady = await this.checkRedis();
        const ready = redisReady;
        return {
            ready,
            timestamp: new Date().toISOString(),
            checks: {
                redis: redisReady,
                database: true,
            },
        };
    }
    async health() {
        const redisCheck = await this.checkRedisWithLatency();
        const signalingStats = await this.signalingService.getGlobalStats();
        const isHealthy = redisCheck.status === 'up';
        return {
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            instanceId: this.signalingService.getInstanceId(),
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            checks: {
                redis: redisCheck,
                signaling: {
                    activeMeetings: signalingStats.totalMeetings,
                    activeParticipants: signalingStats.totalParticipants,
                },
            },
        };
    }
    async metrics() {
        const stats = await this.signalingService.getGlobalStats();
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        return [
            '# HELP meetclone_active_meetings Number of active meetings',
            '# TYPE meetclone_active_meetings gauge',
            `meetclone_active_meetings ${stats.totalMeetings}`,
            '',
            '# HELP meetclone_active_participants Number of active participants',
            '# TYPE meetclone_active_participants gauge',
            `meetclone_active_participants ${stats.totalParticipants}`,
            '',
            '# HELP meetclone_uptime_seconds Server uptime in seconds',
            '# TYPE meetclone_uptime_seconds counter',
            `meetclone_uptime_seconds ${uptime}`,
            '',
        ].join('\n');
    }
    async checkRedis() {
        try {
            await this.redisService.getClient().ping();
            return true;
        }
        catch {
            return false;
        }
    }
    async checkRedisWithLatency() {
        try {
            const start = Date.now();
            await this.redisService.getClient().ping();
            const latencyMs = Date.now() - start;
            return { status: 'up', latencyMs };
        }
        catch {
            return { status: 'down' };
        }
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)('live'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "liveness", null);
__decorate([
    (0, common_1.Get)('ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "readiness", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "health", null);
__decorate([
    (0, common_1.Get)('metrics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "metrics", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        redis_signaling_service_1.RedisSignalingService])
], HealthController);
//# sourceMappingURL=health.controller.js.map