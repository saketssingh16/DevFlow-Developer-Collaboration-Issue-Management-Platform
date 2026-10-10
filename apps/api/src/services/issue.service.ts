import { IssuePriority, IssueStatus, IssueType, Prisma } from '@prisma/client';
import { CreateIssueInput, IssueQueryInput, UpdateIssueInput, issueQuerySchema } from '@devflow/validation';
import { prisma } from '../config/database.js';
import { cacheService } from './cache.service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { activityService } from './activity.service.js';
import { notificationService } from './notification.service.js';

const issueInclude = {
  reporter: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
  comments: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' as const } },
  labels: { include: { label: true } }
};

export class IssueService {
  private async validateIssueRelations(tx: Prisma.TransactionClient, organizationId: string, projectId: string, assigneeId: string | null | undefined, labelIds: string[] | undefined): Promise<void> {
    if (assigneeId) {
      const [organizationMember, projectMember] = await Promise.all([
        tx.organizationMember.findUnique({ where: { organizationId_userId: { organizationId, userId: assigneeId } }, select: { role: true } }),
        tx.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: assigneeId } }, select: { id: true } })
      ]);
      const isOrganizationAdmin = organizationMember?.role === 'OWNER' || organizationMember?.role === 'ADMIN';
      if (!organizationMember || (!projectMember && !isOrganizationAdmin)) throw new ForbiddenError('Assignee must have access to this project');
    }
    if (labelIds && labelIds.length > 0) {
      const labels = await tx.label.findMany({ where: { id: { in: labelIds }, organizationId }, select: { id: true } });
      if (labels.length !== new Set(labelIds).size) throw new NotFoundError('One or more labels do not belong to this organization');
    }
  }

  async list(projectId: string, rawQuery: Record<string, unknown>) {
    const query: IssueQueryInput = issueQuerySchema.parse(rawQuery);
    const where: Prisma.IssueWhereInput = {
      projectId,
      deletedAt: null,
      ...(query.status ? { status: query.status as IssueStatus } : {}),
      ...(query.priority ? { priority: query.priority as IssuePriority } : {}),
      ...(query.type ? { type: query.type as IssueType } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.reporterId ? { reporterId: query.reporterId } : {}),
      ...(query.labelId ? { labels: { some: { labelId: query.labelId } } } : {}),
      ...(query.search ? { OR: [{ title: { contains: query.search } }, { description: { contains: query.search } }] } : {})
    };
    const [total, issues] = await Promise.all([
      prisma.issue.count({ where }),
      prisma.issue.findMany({
        where, skip: (query.page - 1) * query.limit, take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: { reporter: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } }
      })
    ]);
    return { issues, total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) };
  }

  async listAssignedToUser(organizationId: string, userId: string) {
    return prisma.issue.findMany({
      where: {
        deletedAt: null,
        assigneeId: userId,
        project: { organizationId }
      },
      include: { project: { select: { id: true, name: true, key: true } } },
      orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
      take: 100
    });
  }

  async get(projectId: string, issueId: string) {
    const issue = await prisma.issue.findFirst({ where: { id: issueId, projectId, deletedAt: null }, include: issueInclude });
    if (!issue) throw new NotFoundError('Issue not found');
    return issue;
  }

  async create(orgId: string, projectId: string, actorId: string, input: CreateIssueInput) {
    const issue = await prisma.$transaction(async (tx) => {
      await this.validateIssueRelations(tx, orgId, projectId, input.assigneeId, input.labelIds);
      const project = await tx.project.update({ where: { id: projectId }, data: { issueSeq: { increment: 1 } }, select: { issueSeq: true, key: true } });
      return tx.issue.create({
        data: {
          projectId, publicId: `${project.key}-${project.issueSeq}`, title: input.title, description: input.description,
          type: input.type, priority: input.priority, status: input.status, reporterId: actorId,
          assigneeId: input.assigneeId, dueDate: input.dueDate ? new Date(input.dueDate) : null,
          ...(input.labelIds ? { labels: { create: input.labelIds.map((labelId) => ({ labelId })) } } : {})
        }, include: issueInclude
      });
    });
    await cacheService.invalidateTenantCache(orgId, 'project');
    await activityService.record({ organizationId: orgId, projectId, issueId: issue.id, actorId, action: 'ISSUE_CREATED', entityType: 'ISSUE', entityId: issue.id, payload: { publicId: issue.publicId, title: issue.title } });
    if (issue.assigneeId && issue.assigneeId !== actorId) await notificationService.createNotification({ userId: issue.assigneeId, organizationId: orgId, title: 'Issue assigned to you', message: `${issue.publicId}: ${issue.title}`, type: 'ISSUE_ASSIGNED', link: `/projects/${projectId}/issues/${issue.id}` });
    return issue;
  }

  async update(orgId: string, projectId: string, issueId: string, actorId: string, input: UpdateIssueInput) {
    const existing = await this.get(projectId, issueId);
    if (input.version === undefined) throw new ConflictError('Issue version is required for updates');
    if (input.version !== existing.version) throw new ConflictError('Issue has been updated by another user');
    const { version: _version, labelIds, dueDate, ...data } = input;
    const issue = await prisma.$transaction(async (tx) => {
      await this.validateIssueRelations(tx, orgId, projectId, data.assigneeId, labelIds);
      const update = await tx.issue.updateMany({
        where: { id: issueId, projectId, deletedAt: null, version: input.version },
        data: {
          ...data, dueDate: dueDate === undefined ? undefined : dueDate ? new Date(dueDate) : null,
          ...(labelIds ? { labels: { deleteMany: {}, create: labelIds.map((labelId) => ({ labelId })) } } : {}),
          version: { increment: 1 }
        }
      });
      if (update.count !== 1) throw new ConflictError('Issue has been updated by another user');
      return tx.issue.findFirstOrThrow({ where: { id: issueId, projectId }, include: issueInclude });
    });
    await cacheService.invalidateTenantCache(orgId, 'project');
    await activityService.record({ organizationId: orgId, projectId, issueId, actorId, action: input.status && input.status !== existing.status ? 'ISSUE_STATUS_CHANGED' : 'ISSUE_UPDATED', entityType: 'ISSUE', entityId: issueId, payload: { status: input.status, assigneeId: input.assigneeId } });
    if (input.assigneeId && input.assigneeId !== existing.assigneeId && input.assigneeId !== actorId) await notificationService.createNotification({ userId: input.assigneeId, organizationId: orgId, title: 'Issue assigned to you', message: `${issue.publicId}: ${issue.title}`, type: 'ISSUE_ASSIGNED', link: `/projects/${projectId}/issues/${issue.id}` });
    return issue;
  }

  async comment(orgId: string, projectId: string, issueId: string, actorId: string, body: string) {
    await this.get(projectId, issueId);
    const comment = await prisma.comment.create({ data: { issueId, authorId: actorId, body }, include: { author: { select: { id: true, name: true } } } });
    await activityService.record({ organizationId: orgId, projectId, issueId, actorId, action: 'COMMENT_CREATED', entityType: 'COMMENT', entityId: comment.id });
    return comment;
  }
}

export const issueService = new IssueService();
