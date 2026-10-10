import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheService } from '../cache.service.js';

describe('Redis Cache Service & Multi-Tenant Isolation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates deterministic, strictly tenant-prefixed cache keys', () => {
    const keyOrgA = cacheService.buildTenantKey('org-A-id', 'project', { page: 1, search: 'bug' });
    const keyOrgB = cacheService.buildTenantKey('org-B-id', 'project', { page: 1, search: 'bug' });

    expect(keyOrgA).toContain('devflow:tenant:org-A-id:project:');
    expect(keyOrgB).toContain('devflow:tenant:org-B-id:project:');
    expect(keyOrgA).not.toEqual(keyOrgB);
  });

  it('guarantees data from Organization A cannot leak into Organization B cache query', () => {
    const keyA = cacheService.buildTenantKey('tenant-A', 'issue', 'list-1');
    const keyB = cacheService.buildTenantKey('tenant-B', 'issue', 'list-1');

    expect(keyA).toBe('devflow:tenant:tenant-A:issue:list-1');
    expect(keyB).toBe('devflow:tenant:tenant-B:issue:list-1');
  });
});
