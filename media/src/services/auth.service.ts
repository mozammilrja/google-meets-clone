import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * JWT payload structure (must match backend)
 * Backend issues JWT with 'sub' claim for user ID
 */
export interface JwtPayload {
  sub: string; // User ID from backend
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

/**
 * AuthService handles JWT token verification for media server access.
 * 
 * Token-based handoff: Backend issues JWT, media server verifies it.
 * This ensures only authenticated users can connect to the SFU.
 */
export class AuthService {
  /**
   * Verify JWT token and extract payload
   */
  verifyToken(token: string): JwtPayload {
    try {
      // Log token info for debugging (first 20 chars only for security)
      const tokenPreview = token?.substring(0, 20) + '...';
      logger.info({ tokenPreview, secretConfigured: !!config.jwt.secret }, 'Verifying JWT token');
      
      const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
      
      logger.info({ 
        userId: payload.sub, 
        email: payload.email,
        exp: payload.exp,
        now: Math.floor(Date.now() / 1000)
      }, 'JWT verification successful');
      
      return payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn({ 
        error: message,
        tokenLength: token?.length,
        secretLength: config.jwt.secret?.length
      }, 'JWT verification failed');
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(payload: JwtPayload): boolean {
    if (!payload.exp) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }
}
