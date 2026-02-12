import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../redis/redis.service';
import { RATE_LIMIT_KEY, RateLimitConfig } from '../decorators/rate-limit.decorator';

/**
 * RateLimitGuard enforces rate limiting using Redis for storage.
 * 
 * How it works:
 * 1. Extracts user ID or IP address as rate limit key
 * 2. Increments request counter in Redis
 * 3. Sets TTL on first request in the window
 * 4. Rejects requests that exceed the limit
 * 
 * Uses the @RateLimit() decorator to configure limits per route.
 * 
 * Algorithm: Sliding window counter with Redis INCR + TTL
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get rate limit config from decorator
    const rateLimitConfig = this.reflector.get<RateLimitConfig>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitConfig) {
      // No rate limit configured, allow request
      return true;
    }

    const { limit, windowSeconds, keyPrefix = 'rate-limit', errorMessage } = rateLimitConfig;

    const request = context.switchToHttp().getRequest();
    
    // Build rate limit key: user ID or IP address
    const userId = request.user?.userId;
    const ipAddress = request.ip || request.connection.remoteAddress;
    const identifier = userId || ipAddress;
    const route = request.route?.path || request.url;
    
    const redisKey = `${keyPrefix}:${route}:${identifier}`;

    try {
      // Increment request count
      const currentCount = await this.redisService.incr(redisKey);

      // On first request in window, set TTL
      if (currentCount === 1) {
        await this.redisService.expire(redisKey, windowSeconds);
      }

      // Check if limit exceeded
      if (currentCount > limit) {
        const ttl = await this.redisService.ttl(redisKey);
        
        this.logger.warn(
          `Rate limit exceeded for ${identifier} on ${route}: ${currentCount}/${limit} (window: ${ttl}s remaining)`,
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: errorMessage || 'Rate limit exceeded. Please try again later.',
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Log when getting close to limit (80%+)
      if (currentCount >= limit * 0.8) {
        this.logger.warn(
          `Rate limit warning for ${identifier} on ${route}: ${currentCount}/${limit}`,
        );
      }

      return true;
    } catch (error) {
      // If Redis is down, log error but allow request (fail open)
      if (error instanceof HttpException) {
        throw error;
      }
      
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Rate limit check failed (Redis error), allowing request: ${err.message}`,
      );
      return true;
    }
  }
}
