import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../redis/redis.service';
export declare class RateLimitGuard implements CanActivate {
    private readonly reflector;
    private readonly redisService;
    private readonly logger;
    constructor(reflector: Reflector, redisService: RedisService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
