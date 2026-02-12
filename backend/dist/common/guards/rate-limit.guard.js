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
var RateLimitGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const redis_service_1 = require("../../redis/redis.service");
const rate_limit_decorator_1 = require("../decorators/rate-limit.decorator");
let RateLimitGuard = RateLimitGuard_1 = class RateLimitGuard {
    constructor(reflector, redisService) {
        this.reflector = reflector;
        this.redisService = redisService;
        this.logger = new common_1.Logger(RateLimitGuard_1.name);
    }
    async canActivate(context) {
        const rateLimitConfig = this.reflector.get(rate_limit_decorator_1.RATE_LIMIT_KEY, context.getHandler());
        if (!rateLimitConfig) {
            return true;
        }
        const { limit, windowSeconds, keyPrefix = 'rate-limit', errorMessage } = rateLimitConfig;
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.userId;
        const ipAddress = request.ip || request.connection.remoteAddress;
        const identifier = userId || ipAddress;
        const route = request.route?.path || request.url;
        const redisKey = `${keyPrefix}:${route}:${identifier}`;
        try {
            const currentCount = await this.redisService.incr(redisKey);
            if (currentCount === 1) {
                await this.redisService.expire(redisKey, windowSeconds);
            }
            if (currentCount > limit) {
                const ttl = await this.redisService.ttl(redisKey);
                this.logger.warn(`Rate limit exceeded for ${identifier} on ${route}: ${currentCount}/${limit} (window: ${ttl}s remaining)`);
                throw new common_1.HttpException({
                    statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                    message: errorMessage || 'Rate limit exceeded. Please try again later.',
                    retryAfter: ttl,
                }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            if (currentCount >= limit * 0.8) {
                this.logger.warn(`Rate limit warning for ${identifier} on ${route}: ${currentCount}/${limit}`);
            }
            return true;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error(`Rate limit check failed (Redis error), allowing request: ${err.message}`);
            return true;
        }
    }
};
exports.RateLimitGuard = RateLimitGuard;
exports.RateLimitGuard = RateLimitGuard = RateLimitGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        redis_service_1.RedisService])
], RateLimitGuard);
//# sourceMappingURL=rate-limit.guard.js.map