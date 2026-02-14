import { RedisService } from '../redis/redis.service';
import { RedisSignalingService } from '../signaling/redis-signaling.service';
interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    instanceId: string;
    uptime: number;
    checks: {
        redis: {
            status: 'up' | 'down';
            latencyMs?: number;
        };
        signaling: {
            activeMeetings: number;
            activeParticipants: number;
        };
    };
}
interface ReadinessStatus {
    ready: boolean;
    timestamp: string;
    checks: {
        redis: boolean;
        database: boolean;
    };
}
export declare class HealthController {
    private readonly redisService;
    private readonly signalingService;
    private readonly startTime;
    constructor(redisService: RedisService, signalingService: RedisSignalingService);
    liveness(): Promise<{
        status: string;
    }>;
    readiness(): Promise<ReadinessStatus>;
    health(): Promise<HealthStatus>;
    metrics(): Promise<string>;
    private checkRedis;
    private checkRedisWithLatency;
}
export {};
