import { Controller, Get } from '@nestjs/common';
import { RoomService } from './services/room.service';
import { config } from './config';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  instanceId: string;
  region: string;
  uptime: number;
  workers: {
    total: number;
    rtcMinPort: number;
    rtcMaxPort: number;
  };
  rooms: {
    active: number;
    totalPeers: number;
    totalProducers: number;
    totalConsumers: number;
  };
}

@Controller()
export class AppController {
  private readonly startTime = Date.now();

  constructor(private readonly roomService: RoomService) {}

  /**
   * Liveness probe - is the process running?
   */
  @Get('health/live')
  liveness() {
    return { status: 'alive' };
  }

  /**
   * Readiness probe - is the server ready for traffic?
   */
  @Get('health/ready')
  readiness() {
    const stats = this.roomService.getStats();
    return {
      ready: stats.workers > 0,
      timestamp: new Date().toISOString(),
      workers: stats.workers,
    };
  }

  /**
   * Full health check with detailed status
   */
  @Get('health')
  health(): HealthStatus {
    const stats = this.roomService.getStats();
    
    return {
      status: stats.workers > 0 ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      instanceId: config.instance.id,
      region: config.instance.region,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      workers: {
        total: stats.workers,
        rtcMinPort: config.mediasoup.worker.rtcMinPort,
        rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
      },
      rooms: {
        active: stats.rooms,
        totalPeers: stats.peers,
        totalProducers: stats.producers,
        totalConsumers: stats.consumers,
      },
    };
  }

  /**
   * Prometheus metrics endpoint
   */
  @Get('health/metrics')
  metrics(): string {
    const stats = this.roomService.getStats();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return [
      '# HELP meetclone_media_workers Number of mediasoup workers',
      '# TYPE meetclone_media_workers gauge',
      `meetclone_media_workers ${stats.workers}`,
      '',
      '# HELP meetclone_media_rooms Number of active rooms',
      '# TYPE meetclone_media_rooms gauge',
      `meetclone_media_rooms ${stats.rooms}`,
      '',
      '# HELP meetclone_media_peers Number of connected peers',
      '# TYPE meetclone_media_peers gauge',
      `meetclone_media_peers ${stats.peers}`,
      '',
      '# HELP meetclone_media_producers Number of active producers',
      '# TYPE meetclone_media_producers gauge',
      `meetclone_media_producers ${stats.producers}`,
      '',
      '# HELP meetclone_media_consumers Number of active consumers',
      '# TYPE meetclone_media_consumers gauge',
      `meetclone_media_consumers ${stats.consumers}`,
      '',
      '# HELP meetclone_media_uptime_seconds Server uptime in seconds',
      '# TYPE meetclone_media_uptime_seconds counter',
      `meetclone_media_uptime_seconds ${uptime}`,
      '',
    ].join('\n');
  }

  @Get('stats')
  stats() {
    return this.roomService.getStats();
  }

  /**
   * Get ICE servers configuration (for clients)
   */
  @Get('ice-servers')
  iceServers() {
    return {
      iceServers: config.iceServers,
    };
  }
}
