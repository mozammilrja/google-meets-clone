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
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
let RedisService = RedisService_1 = class RedisService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(RedisService_1.name);
    }
    async onModuleInit() {
        const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';
        this.client = new ioredis_1.default(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });
        this.subscriber = new ioredis_1.default(redisUrl);
        this.publisher = new ioredis_1.default(redisUrl);
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
    getClient() {
        return this.client;
    }
    getSubscriber() {
        return this.subscriber;
    }
    getPublisher() {
        return this.publisher;
    }
    async set(key, value, ttlSeconds) {
        if (ttlSeconds) {
            await this.client.set(key, value, 'EX', ttlSeconds);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async get(key) {
        return await this.client.get(key);
    }
    async del(key) {
        await this.client.del(key);
    }
    async exists(key) {
        const result = await this.client.exists(key);
        return result === 1;
    }
    async expire(key, seconds) {
        await this.client.expire(key, seconds);
    }
    async ttl(key) {
        return await this.client.ttl(key);
    }
    async hset(key, field, value) {
        await this.client.hset(key, field, value);
    }
    async hget(key, field) {
        return await this.client.hget(key, field);
    }
    async hgetall(key) {
        return await this.client.hgetall(key);
    }
    async hdel(key, field) {
        await this.client.hdel(key, field);
    }
    async sadd(key, ...members) {
        await this.client.sadd(key, ...members);
    }
    async srem(key, ...members) {
        await this.client.srem(key, ...members);
    }
    async smembers(key) {
        return await this.client.smembers(key);
    }
    async sismember(key, member) {
        const result = await this.client.sismember(key, member);
        return result === 1;
    }
    async scard(key) {
        return await this.client.scard(key);
    }
    async zadd(key, score, member) {
        await this.client.zadd(key, score, member);
    }
    async zrange(key, start, stop) {
        return await this.client.zrange(key, start, stop);
    }
    async zrangebyscore(key, min, max) {
        return await this.client.zrangebyscore(key, min, max);
    }
    async zrem(key, member) {
        await this.client.zrem(key, member);
    }
    async incr(key) {
        return await this.client.incr(key);
    }
    async incrby(key, increment) {
        return await this.client.incrby(key, increment);
    }
    async decr(key) {
        return await this.client.decr(key);
    }
    async subscribe(channel, handler) {
        this.subscriber.subscribe(channel);
        this.subscriber.on('message', (ch, message) => {
            if (ch === channel) {
                handler(message);
            }
        });
        this.logger.log(`Subscribed to Redis channel: ${channel}`);
    }
    async unsubscribe(channel) {
        await this.subscriber.unsubscribe(channel);
        this.logger.log(`Unsubscribed from Redis channel: ${channel}`);
    }
    async publish(channel, message) {
        await this.publisher.publish(channel, message);
    }
    async eval(script, numKeys, ...args) {
        return await this.client.eval(script, numKeys, ...args);
    }
    async mget(...keys) {
        return await this.client.mget(...keys);
    }
    async mset(keyValuePairs) {
        const flatArray = Object.entries(keyValuePairs).flat();
        await this.client.mset(...flatArray);
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map