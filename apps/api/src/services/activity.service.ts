import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

export interface ActivityFilters {
  page: number;
  limit: number;
  action?: string;
  entityType?: string;
  projectId?: string;
  from?: Date;
  to?: Date;
}

export class ActivityService {
  async record(event: {
    organizationId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    projectId?: string;
    issueId?: string;
    payload?: Record<string, unknown>;
  }) {
    return prisma.activityLog.create({ data: { ...event, payload: event.payload as Prisma.InputJsonValue | undefined } });
  }

  async listOrganizationActivity(organizationId: string, filters: ActivityFilters) {
    const { page, limit, action, entityType, projectId, from, to } = filters;
    const where = {
      organizationId,
      ...(projectId ? { projectId } : {}),
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {})
    };
    const [total, items] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, name: true, email: true, avatarUrl: true } },
          project: { select: { id: true, name: true, key: true } },
          issue: { select: { id: true, publicId: true, title: true } }
        }
      })
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listProjectActivity(organizationId: string, projectId: string, filters: Omit<ActivityFilters, 'projectId'>) {
    return this.listOrganizationActivity(organizationId, { ...filters, projectId });
  }
}

export const activityService = new ActivityService();
