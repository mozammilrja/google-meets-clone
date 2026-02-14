import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MeetingsModule } from './meetings/meetings.module';
import { AuditModule } from './audit/audit.module';
import { SignalingModule } from './signaling/signaling.module';
import { RedisModule } from './redis/redis.module';
import { HealthController } from './common/health.controller';
import { GracefulShutdownService } from './common/graceful-shutdown.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI || ''),
    RedisModule,
    AuthModule,
    UsersModule,
    MeetingsModule,
    AuditModule,
    SignalingModule,
  ],
  controllers: [HealthController],
  providers: [GracefulShutdownService],
})
export class AppModule {}
