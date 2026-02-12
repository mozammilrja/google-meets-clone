import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * RedisService provides a wrapper around ioredis client for caching,
 * pub/sub, and distributed state management.
 * 
 * Features:
 * - Key-value caching with TTL
 * - Pub/sub for multi-instance coordination
 * - Atomic operations for rate limiting
 * - Graceful connection management
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private subscriber!: Redis;
  private publisher!: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    
    // Main client for commands
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // Separate connections for pub/sub (required by ioredis)
    this.subscriber = new Redis(redisUrl);
    this.publisher = new Redis(redisUrl);

    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis client error:', error);
    });

    this.logger.log('RedisService initialized');
  }

  async onModuleDestroy() {
    await this.client.quit();
    await this.subscriber.quit();
    await this.publisher.quit();
    this.logger.log('Redis connections closed');
  }

  /**
   * Get the raw Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Get the pub/sub subscriber client
   */
  getSubscriber(): Redis {
    return this.subscriber;
  }

  /**
   * Get the pub/sub publisher client
   */
  getPublisher(): Redis {
    return this.publisher;
  }

  // ============================================================
  // Key-Value Operations (Caching)
  // ============================================================

  /**
   * Set a key-value pair with optional TTL (in seconds)
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Set expiration on a key (in seconds)
   */
  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  /**
   * Get time-to-live for a key (in seconds)
   */
  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  // ============================================================
  // Hash Operations (for structured data)
  // ============================================================

  /**
   * Set a hash field
   */
  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  /**
   * Get a hash field
   */
  async hget(key: string, field: string): Promise<string | null> {
    return await this.client.hget(key, field);
  }

  /**
   * Get all fields and values in a hash
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hgetall(key);
  }

  /**
   * Delete a hash field
   */
  async hdel(key: string, field: string): Promise<void> {
    await this.client.hdel(key, field);
  }

  // ============================================================
  // Set Operations (for membership tracking)
  // ============================================================

  /**
   * Add member(s) to a set
   */
  async sadd(key: string, ...members: string[]): Promise<void> {
    await this.client.sadd(key, ...members);
  }

  /**
   * Remove member(s) from a set
   */
  async srem(key: string, ...members: string[]): Promise<void> {
    await this.client.srem(key, ...members);
  }

  /**
   * Get all members of a set
   */
  async smembers(key: string): Promise<string[]> {
    return await this.client.smembers(key);
  }

  /**
   * Check if a member is in a set
   */
  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member);
    return result === 1;
  }

  /**
   * Get the number of members in a set
   */
  async scard(key: string): Promise<number> {
    return await this.client.scard(key);
  }

  // ============================================================
  // Sorted Set Operations (for leaderboards, time-ordered data)
  // ============================================================

  /**
   * Add member to sorted set with score
   */
  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.client.zadd(key, score, member);
  }

  /**
   * Get sorted set members by rank range (0-based, inclusive)
   */
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.zrange(key, start, stop);
  }

  /**
   * Get sorted set members by score range
   */
  async zrangebyscore(key: string, min: number, max: number): Promise<string[]> {
    return await this.client.zrangebyscore(key, min, max);
  }

  /**
   * Remove member from sorted set
   */
  async zrem(key: string, member: string): Promise<void> {
    await this.client.zrem(key, member);
  }

  // ============================================================
  // Atomic Operations (for rate limiting)
  // ============================================================

  /**
   * Increment a counter atomically
   */
  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  /**
   * Increment by a specific amount
   */
  async incrby(key: string, increment: number): Promise<number> {
    return await this.client.incrby(key, increment);
  }

  /**
   * Decrement a counter atomically
   */
  async decr(key: string): Promise<number> {
    return await this.client.decr(key);
  }

  // ============================================================
  // Pub/Sub Operations
  // ============================================================

  /**
   * Subscribe to a channel with a message handler
   */
  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        handler(message);
      }
    });
    this.logger.log(`Subscribed to Redis channel: ${channel}`);
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string): Promise<void> {
    await this.subscriber.unsubscribe(channel);
    this.logger.log(`Unsubscribed from Redis channel: ${channel}`);
  }

  /**
   * Publish a message to a channel
   */
  async publish(channel: string, message: string): Promise<void> {
    await this.publisher.publish(channel, message);
  }

  // ============================================================
  // Advanced Operations
  // ============================================================

  /**
   * Execute a Lua script (for atomic multi-step operations)
   */
  async eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<any> {
    return await this.client.eval(script, numKeys, ...args);
  }

  /**
   * Get multiple keys at once
   */
  async mget(...keys: string[]): Promise<(string | null)[]> {
    return await this.client.mget(...keys);
  }

  /**
   * Set multiple keys at once
   */
  async mset(keyValuePairs: Record<string, string>): Promise<void> {
    const flatArray = Object.entries(keyValuePairs).flat();
    await this.client.mset(...flatArray);
  }
}
