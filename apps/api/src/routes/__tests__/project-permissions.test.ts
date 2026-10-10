import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { organizationRepository } from '../../repositories/organization.repository.js';
import { projectRepository } from '../../repositories/project.repository.js';
import { prisma } from '../../config/database.js';
import { generateAccessToken } from '../../utils/token.js';
import { OrgRole, ProjectRole } from '@devflow/shared';

describe('Project Management & Authorization Tests', () => {
  const app = createApp();

  const orgId = 'org-1-uuid';
  const orgIdOther = 'org-other-uuid';
  const adminToken = generateAccessToken({ userId: 'user-admin', email: 'admin@org1.com' });
  const devToken = generateAccessToken({ userId: 'user-dev', email: 'dev@org1.com' });
  const outsiderToken = generateAccessToken({ userId: 'user-outsider', email: 'outsider@other.com' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/organizations/:organizationId/projects', () => {
    it('allows Organization ADMIN to create a project with key', async () => {
      vi.spyOn(organizationRepository, 'getMember').mockResolvedValue({
        id: 'mem-1',
        organizationId: orgId,
        userId: 'user-admin',
        role: OrgRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      vi.spyOn(projectRepository, 'findByKey').mockResolvedValue(null);
      vi.spyOn(projectRepository, 'createProject').mockResolvedValue({
        id: 'proj-1',
        organizationId: orgId,
        name: 'Backend Core',
        key: 'ENG',
        description: 'Core API Engine',
        status: 'ACTIVE',
        ownerId: 'user-admin',
        issueSeq: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Backend Core',
          key: 'ENG',
          description: 'Core API Engine'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.key).toBe('ENG');
    });

    it('blocks outsider from creating project in another organization', async () => {
      vi.spyOn(organizationRepository, 'getMember').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/projects`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          name: 'Hacked Project',
          key: 'HACK'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/projects/:projectId', () => {
    it('prevents non-members from accessing project details', async () => {
      vi.spyOn(prisma.project, 'findUnique').mockResolvedValue({
        id: 'proj-1',
        organizationId: orgId,
        name: 'Secret Project',
        key: 'SEC',
        ownerId: 'user-admin'
      } as never);

      vi.spyOn(prisma.organizationMember, 'findUnique').mockResolvedValue(null); // Outsider not in org

      const res = await request(app)
        .get('/api/v1/projects/proj-1')
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
