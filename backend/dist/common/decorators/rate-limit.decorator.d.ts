export interface RateLimitConfig {
    limit: number;
    windowSeconds: number;
    keyPrefix?: string;
    errorMessage?: string;
}
export declare const RATE_LIMIT_KEY = "rate-limit";
export declare const RateLimit: (config: RateLimitConfig) => import("@nestjs/common").CustomDecorator<string>;
