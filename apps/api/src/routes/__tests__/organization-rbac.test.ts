import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { organizationRepository } from '../../repositories/organization.repository.js';
import { generateAccessToken } from '../../utils/token.js';
import { OrgRole } from '@devflow/shared';
import { activityService } from '../../services/activity.service.js';

describe('Organization RBAC Authorization Tests', () => {
  const app = createApp();

  const mockOrgId = 'org-acme-uuid';
  const ownerToken = generateAccessToken({ userId: 'user-owner', email: 'owner@acme.com' });
  const adminToken = generateAccessToken({ userId: 'user-admin', email: 'admin@acme.com' });
  const managerToken = generateAccessToken({ userId: 'user-manager', email: 'manager@acme.com' });
  const devToken = generateAccessToken({ userId: 'user-dev', email: 'dev@acme.com' });
  const viewerToken = generateAccessToken({ userId: 'user-viewer', email: 'viewer@acme.com' });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(activityService, 'record').mockResolvedValue({} as never);
  });

  function setupUserRole(userId: string, role: OrgRole) {
    vi.spyOn(organizationRepository, 'getMember').mockImplementation(async (orgId, uId) => {
      if (orgId === mockOrgId && uId === userId) {
        return {
          id: `mem-${userId}`,
          organizationId: mockOrgId,
          userId,
          role,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      return null;
    });
  }

  describe('OWNER role capabilities', () => {
    it('OWNER can perform owner operations (delete organization, change role)', async () => {
      setupUserRole('user-owner', OrgRole.OWNER);
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue({ id: mockOrgId } as never);
      vi.spyOn(organizationRepository, 'softDeleteOrganization').mockResolvedValue({} as never);

      const res = await request(app)
        .delete(`/api/v1/organizations/${mockOrgId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('ADMIN role capabilities & limits', () => {
    it('ADMIN can invite new members', async () => {
      setupUserRole('user-admin', OrgRole.ADMIN);
      vi.spyOn(organizationRepository, 'createInvitation').mockResolvedValue({ id: 'inv-1' } as never);

      const res = await request(app)
        .post(`/api/v1/organizations/${mockOrgId}/invitations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newmember@acme.com',
          role: 'DEVELOPER'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('ADMIN CANNOT perform OWNER-only operations (delete organization)', async () => {
      setupUserRole('user-admin', OrgRole.ADMIN);

      const res = await request(app)
        .delete(`/api/v1/organizations/${mockOrgId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Minimum role required: OWNER');
    });
  });

  describe('MANAGER role limits', () => {
    it('MANAGER CANNOT perform OWNER-only operations (change member role)', async () => {
      setupUserRole('user-manager', OrgRole.MANAGER);

      const res = await request(app)
        .patch(`/api/v1/organizations/${mockOrgId}/members/mem-target/role`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Minimum role required: OWNER');
    });
  });

  describe('DEVELOPER role limits', () => {
    it('DEVELOPER CANNOT perform ADMIN-only operations (invite members)', async () => {
      setupUserRole('user-dev', OrgRole.DEVELOPER);

      const res = await request(app)
        .post(`/api/v1/organizations/${mockOrgId}/invitations`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({ email: 'test@acme.com', role: 'DEVELOPER' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Minimum role required: ADMIN');
    });
  });

  describe('VIEWER role limits', () => {
    it('VIEWER CANNOT mutate organization data (update organization settings)', async () => {
      setupUserRole('user-viewer', OrgRole.VIEWER);

      const res = await request(app)
        .patch(`/api/v1/organizations/${mockOrgId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Hacked Org Name' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Minimum role required: ADMIN');
    });

    it('VIEWER can read organization details and member list', async () => {
      setupUserRole('user-viewer', OrgRole.VIEWER);
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue({ id: mockOrgId, name: 'Acme Corp' } as never);
      vi.spyOn(organizationRepository, 'listMembers').mockResolvedValue([]);

      const detailsRes = await request(app)
        .get(`/api/v1/organizations/${mockOrgId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(detailsRes.status).toBe(200);

      const membersRes = await request(app)
        .get(`/api/v1/organizations/${mockOrgId}/members`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(membersRes.status).toBe(200);
    });
  });
});
