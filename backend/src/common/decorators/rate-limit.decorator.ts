import { SetMetadata } from '@nestjs/common';

/**
 * Rate limit configuration metadata
 */
export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  limit: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Custom key prefix for Redis (defaults to 'rate-limit')
   */
  keyPrefix?: string;

  /**
   * Error message to return when rate limit is exceeded
   */
  errorMessage?: string;
}

export const RATE_LIMIT_KEY = 'rate-limit';

/**
 * Decorator to apply rate limiting to a controller or route handler.
 * 
 * Usage:
 * ```typescript
 * @RateLimit({ limit: 10, windowSeconds: 60 })
 * @Post('login')
 * async login() { ... }
 * ```
 * 
 * This means: Allow 10 requests per 60 seconds per user/IP.
 */
export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config);
