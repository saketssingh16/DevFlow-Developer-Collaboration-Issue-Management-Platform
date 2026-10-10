import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';

export class CacheService {
  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;

    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${this.stableStringify(record[key])}`)
      .join(',')}}`;
  }

  /**
   * Generates a deterministic, strictly tenant-isolated cache key.
   */
  public buildTenantKey(organizationId: string, namespace: string, identifierOrFilters?: string | Record<string, unknown>): string {
    const filterString =
      typeof identifierOrFilters === 'string'
        ? identifierOrFilters
        : identifierOrFilters
        ? this.stableStringify(identifierOrFilters)
        : 'default';

    return `devflow:tenant:${organizationId}:${namespace}:${filterString}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      logger.warn({ err, key }, 'Redis cache get error');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    try {
      const stringified = JSON.stringify(value);
      await redis.set(key, stringified, 'EX', ttlSeconds);
    } catch (err) {
      logger.warn({ err, key }, 'Redis cache set error');
    }
  }

  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (err) {
      logger.warn({ err, key }, 'Redis cache delete error');
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        if (keys.length > 0) {
          const pipeline = redis.pipeline();
          keys.forEach((key) => pipeline.del(key));
          await pipeline.exec();
        }
        cursor = nextCursor;
      } while (cursor !== '0');
    } catch (err) {
      logger.warn({ err, pattern }, 'Redis cache pattern deletion error');
    }
  }

  async invalidateTenantCache(organizationId: string, namespace?: string): Promise<void> {
    const pattern = namespace
      ? `devflow:tenant:${organizationId}:${namespace}:*`
      : `devflow:tenant:${organizationId}:*`;
    await this.delPattern(pattern);
  }
}

export const cacheService = new CacheService();
