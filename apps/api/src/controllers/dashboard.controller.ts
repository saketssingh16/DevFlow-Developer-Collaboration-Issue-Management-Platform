import { Response } from 'express';
import { OrgScopedRequest } from '../middleware/org.middleware.js';
import { ProjectScopedRequest } from '../middleware/project.middleware.js';
import { dashboardService } from '../services/dashboard.service.js';
import { activityService } from '../services/activity.service.js';
import { sendPaginated, sendSuccess } from '../utils/apiResponse.js';
import { BadRequestError } from '../utils/errors.js';

function filters(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
  const parseDate = (value: unknown) => {
    if (!value) return undefined;
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) throw new BadRequestError('Invalid activity date filter');
    return date;
  };
  return { page, limit, action: typeof query.action === 'string' ? query.action : undefined, entityType: typeof query.entityType === 'string' ? query.entityType : undefined, from: parseDate(query.from), to: parseDate(query.to) };
}

export class DashboardController {
  getOrganizationDashboard = async (req: OrgScopedRequest, res: Response) => {
    sendSuccess(res, await dashboardService.getOrganizationDashboard(req.params.organizationId));
  };
  getOrganizationActivity = async (req: OrgScopedRequest, res: Response) => {
    const result = await activityService.listOrganizationActivity(req.params.organizationId, filters(req.query));
    sendPaginated(res, result.items, { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages });
  };
  getProjectActivity = async (req: ProjectScopedRequest, res: Response) => {
    const result = await activityService.listProjectActivity(req.project!.organizationId, req.project!.id, filters(req.query));
    sendPaginated(res, result.items, { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages });
  };
}
export const dashboardController = new DashboardController();
