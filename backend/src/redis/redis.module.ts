import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * RedisModule provides Redis client and operations for caching,
 * pub/sub, and distributed state management across the application.
 * 
 * Marked as @Global so it's available everywhere without explicit imports.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
