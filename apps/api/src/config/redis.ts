import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

export const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: null, retryStrategy: (attempt) => Math.min(attempt * 250, 3000) })
  : new Redis({ host: env.REDIS_HOST, port: env.REDIS_PORT, password: env.REDIS_PASSWORD || undefined, lazyConnect: true, maxRetriesPerRequest: null, retryStrategy: (attempt) => Math.min(attempt * 250, 3000) });

redis.on('connect', () => {
  logger.info('Connected to Redis server');
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});
