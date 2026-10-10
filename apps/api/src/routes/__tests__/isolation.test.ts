import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { requireAuthenticatedUser } from '../../middleware/auth.middleware.js';
import { requireOrganizationMember, requireOrganizationRole } from '../../middleware/org.middleware.js';
import { organizationRepository } from '../../repositories/organization.repository.js';
import { generateAccessToken } from '../../utils/token.js';
import { errorHandler } from '../../middleware/errorHandler.js';
import { OrgRole } from '@devflow/shared';

describe('Multi-Tenant Organization Isolation Tests', () => {
  const app = express();
  app.use(express.json());

  // Test endpoint scoped to organization
  app.get(
    '/api/v1/organizations/:organizationId/secure-data',
    requireAuthenticatedUser,
    requireOrganizationMember('organizationId'),
    requireOrganizationRole(OrgRole.DEVELOPER),
    (req, res) => {
      res.json({ success: true, data: { secureField: 'tenant-secret-payload' } });
    }
  );

  app.use(errorHandler);

  it('allows access when user is a verified member of the requested organization', async () => {
    const userToken = generateAccessToken({ userId: 'user-org-A', email: 'userA@orgA.com' });

    vi.spyOn(organizationRepository, 'getMember').mockResolvedValue({
      id: 'mem-1',
      organizationId: 'org-A-id',
      userId: 'user-org-A',
      role: 'DEVELOPER',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const res = await request(app)
      .get('/api/v1/organizations/org-A-id/secure-data')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.secureField).toBe('tenant-secret-payload');
  });

  it('blocks user from Organization B from accessing Organization A data (returns 403 Forbidden)', async () => {
    const userTokenB = generateAccessToken({ userId: 'user-org-B', email: 'userB@orgB.com' });

    // Organization B member querying Organization A
    vi.spyOn(organizationRepository, 'getMember').mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/organizations/org-A-id/secure-data')
      .set('Authorization', `Bearer ${userTokenB}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('Access denied');
  });
});
