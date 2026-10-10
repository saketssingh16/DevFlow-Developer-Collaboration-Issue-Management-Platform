import { Response, NextFunction } from 'express';
import { redis } from '../config/redis.js';
import { ERROR_CODES, ApiErrorResponse } from '@devflow/shared';
import { AuthenticatedRequest } from './auth.middleware.js';

interface RateLimiterOptions {
  windowSeconds?: number;
  maxRequests?: number;
  keyPrefix?: string;
  failOpen?: boolean;
}

export const rateLimiter = (options: RateLimiterOptions = {}) => {
  const windowSeconds = options.windowSeconds || 60; // 1 minute
  const maxRequests = options.maxRequests || 100;
  const keyPrefix = options.keyPrefix || 'rl:global';
  const failOpen = options.failOpen ?? true;

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Skip rate limiting during automated testing
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    try {
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const identifier = req.user?.userId || clientIp;
      const key = `devflow:${keyPrefix}:${identifier}`;

      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      const ttl = await redis.ttl(key);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
      res.setHeader('X-RateLimit-Reset', Math.max(0, ttl));

      if (current > maxRequests) {
        const errorPayload: ApiErrorResponse = {
          success: false,
          error: {
            code: ERROR_CODES.TOO_MANY_REQUESTS,
            message: 'Too many requests. Please slow down and try again shortly.'
          }
        };
        return res.status(429).json(errorPayload);
      }

      next();
    } catch {
      if (failOpen) return next();
      return res.status(503).json({
        success: false,
        error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: 'Authentication protection is temporarily unavailable. Please try again shortly.' }
      });
    }
  };
};

export const authRateLimiter = rateLimiter({
  windowSeconds: 60,
  maxRequests: 15,
  keyPrefix: 'rl:auth',
  failOpen: false
});
