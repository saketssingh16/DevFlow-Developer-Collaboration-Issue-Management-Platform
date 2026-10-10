import { IssuePriority, IssueStatus, IssueType, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { activityService } from './activity.service.js';

const statuses = Object.values(IssueStatus);
const priorities = Object.values(IssuePriority);
const types = Object.values(IssueType);

function toDistribution<T extends string, K extends string>(values: T[], rows: Array<Record<K, T> & { _count: { _all: number } }>, key: K) {
  const counts = new Map<string, number>(rows.map((row) => [String(row[key]), row._count._all]));
  return values.map((name) => ({ name, value: counts.get(name) || 0 }));
}

export class DashboardService {
  async getOrganizationDashboard(organizationId: string) {
    const issueWhere: Prisma.IssueWhereInput = { project: { organizationId }, deletedAt: null };
    const [totalIssues, openIssues, completedIssues, assignedIssues, byStatusRows, byPriorityRows, byTypeRows, recentActivity] = await Promise.all([
      prisma.issue.count({ where: issueWhere }),
      prisma.issue.count({ where: { ...issueWhere, status: { notIn: [IssueStatus.DONE, IssueStatus.CANCELLED] } } }),
      prisma.issue.count({ where: { ...issueWhere, status: IssueStatus.DONE } }),
      prisma.issue.count({ where: { ...issueWhere, assigneeId: { not: null } } }),
      prisma.issue.groupBy({ by: ['status'], where: issueWhere, _count: { _all: true } }),
      prisma.issue.groupBy({ by: ['priority'], where: issueWhere, _count: { _all: true } }),
      prisma.issue.groupBy({ by: ['type'], where: issueWhere, _count: { _all: true } }),
      activityService.listOrganizationActivity(organizationId, { page: 1, limit: 10 })
    ]);
    return {
      totals: { totalIssues, openIssues, completedIssues, assignedIssues, unassignedIssues: totalIssues - assignedIssues },
      issuesByStatus: toDistribution(statuses, byStatusRows, 'status'),
      issuesByPriority: toDistribution(priorities, byPriorityRows, 'priority'),
      issuesByType: toDistribution(types, byTypeRows, 'type'),
      recentActivity: recentActivity.items
    };
  }
}

export const dashboardService = new DashboardService();
