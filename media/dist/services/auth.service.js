"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class AuthService {
    verifyToken(token) {
        try {
            const tokenPreview = token?.substring(0, 20) + '...';
            logger_1.logger.info({ tokenPreview, secretConfigured: !!config_1.config.jwt.secret }, 'Verifying JWT token');
            const payload = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            logger_1.logger.info({
                userId: payload.sub,
                email: payload.email,
                exp: payload.exp,
                now: Math.floor(Date.now() / 1000)
            }, 'JWT verification successful');
            return payload;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger_1.logger.warn({
                error: message,
                tokenLength: token?.length,
                secretLength: config_1.config.jwt.secret?.length
            }, 'JWT verification failed');
            throw new Error('Invalid or expired token');
        }
    }
    isTokenExpired(payload) {
        if (!payload.exp) {
            return false;
        }
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map