import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SignalingGateway } from './signaling.gateway';
import { SignalingService } from './signaling.service';
import { RedisSignalingService } from './redis-signaling.service';
import { AuditModule } from '../audit/audit.module';
import { RedisModule } from '../redis/redis.module';
import { MeetingsModule } from '../meetings/meetings.module';

/**
 * SignalingModule provides real-time WebSocket (Socket.IO) communication
 * for WebRTC signaling, participant presence, and meeting state synchronization.
 * 
 * Dependencies:
 * - JwtModule: For WebSocket authentication via JWT tokens
 * - AuditModule: For logging signaling events (join, leave, etc.)
 * - RedisModule: For pub/sub across multiple backend instances
 * - MeetingsModule: For ChatService to handle real-time messaging
 * 
 * Scaling Support:
 * - Set ENABLE_REDIS_SIGNALING=true to use Redis-backed state for horizontal scaling
 * 
 * Exports:
 * - SignalingService: For other modules to query or manipulate connected participants
 * - RedisSignalingService: For Redis-backed state (horizontal scaling)
 */
@Module({
  imports: [
    AuditModule,
    RedisModule,
    MeetingsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: '24h',
        },
      }),
    }),
  ],
  providers: [SignalingGateway, SignalingService, RedisSignalingService],
  exports: [SignalingService, RedisSignalingService],
})
export class SignalingModule {}
