import { Response } from 'express';
import { ProjectScopedRequest } from '../middleware/project.middleware.js';
import { OrgScopedRequest } from '../middleware/org.middleware.js';
import { issueService } from '../services/issue.service.js';
import { sendPaginated, sendSuccess } from '../utils/apiResponse.js';
export class IssueController {
 myTasks = async (req: OrgScopedRequest, res: Response) => sendSuccess(res, await issueService.listAssignedToUser(req.params.organizationId, req.user!.userId));
 list = async (req: ProjectScopedRequest, res: Response) => { const data = await issueService.list(req.project!.id, req.query); sendPaginated(res, data.issues, { page: data.page, limit: data.limit, total: data.total, totalPages: data.totalPages }); };
 get = async (req: ProjectScopedRequest, res: Response) => sendSuccess(res, await issueService.get(req.project!.id, req.params.issueId));
 create = async (req: ProjectScopedRequest, res: Response) => sendSuccess(res, await issueService.create(req.project!.organizationId, req.project!.id, req.user!.userId, req.body), 201);
 update = async (req: ProjectScopedRequest, res: Response) => sendSuccess(res, await issueService.update(req.project!.organizationId, req.project!.id, req.params.issueId, req.user!.userId, req.body));
 comment = async (req: ProjectScopedRequest, res: Response) => sendSuccess(res, await issueService.comment(req.project!.organizationId, req.project!.id, req.params.issueId, req.user!.userId, req.body.body), 201);
}
export const issueController = new IssueController();
