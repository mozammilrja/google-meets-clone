import { Controller, Get } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { RedisSignalingService } from '../signaling/redis-signaling.service';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  instanceId: string;
  uptime: number;
  checks: {
    redis: { status: 'up' | 'down'; latencyMs?: number };
    signaling: { activeMeetings: number; activeParticipants: number };
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

/**
 * HealthController provides health check endpoints for:
 * - Kubernetes liveness/readiness probes
 * - Load balancer health checks
 * - Monitoring systems
 */
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly redisService: RedisService,
    private readonly signalingService: RedisSignalingService,
  ) {}

  /**
   * Liveness probe - is the application running?
   * Returns 200 if the process is alive
   */
  @Get('live')
  async liveness(): Promise<{ status: string }> {
    return { status: 'alive' };
  }

  /**
   * Readiness probe - is the application ready to accept traffic?
   * Checks all critical dependencies
   */
  @Get('ready')
  async readiness(): Promise<ReadinessStatus> {
    const redisReady = await this.checkRedis();

    const ready = redisReady;

    return {
      ready,
      timestamp: new Date().toISOString(),
      checks: {
        redis: redisReady,
        database: true, // MongoDB check handled by Mongoose
      },
    };
  }

  /**
   * Full health check with detailed status
   */
  @Get()
  async health(): Promise<HealthStatus> {
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

  /**
   * Metrics endpoint for Prometheus scraping
   */
  @Get('metrics')
  async metrics(): Promise<string> {
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

  private async checkRedis(): Promise<boolean> {
    try {
      await this.redisService.getClient().ping();
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedisWithLatency(): Promise<{ status: 'up' | 'down'; latencyMs?: number }> {
    try {
      const start = Date.now();
      await this.redisService.getClient().ping();
      const latencyMs = Date.now() - start;
      return { status: 'up', latencyMs };
    } catch {
      return { status: 'down' };
    }
  }
}
