import { Response } from 'express';
import { projectService } from '../services/project.service.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { OrgScopedRequest } from '../middleware/org.middleware.js';
import { ProjectScopedRequest } from '../middleware/project.middleware.js';
import { UnauthorizedError } from '../utils/errors.js';
import { ProjectRole } from '@devflow/shared';

export class ProjectController {
  create = async (req: OrgScopedRequest, res: Response) => {
    if (!req.user || !req.orgMember) throw new UnauthorizedError();
    const { organizationId } = req.params;
    const project = await projectService.createProject(organizationId, req.body, req.user.userId);
    sendSuccess(res, project, 201);
  };

  listOrganizationProjects = async (req: OrgScopedRequest, res: Response) => {
    const { organizationId } = req.params;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const result = await projectService.listOrganizationProjects(organizationId, page, limit, search, status);
    sendPaginated(res, result.projects, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages
    });
  };

  getDetails = async (req: ProjectScopedRequest, res: Response) => {
    const { projectId } = req.params;
    const organizationId = req.project?.organizationId || req.orgMember?.organizationId;
    if (!organizationId) throw new UnauthorizedError();

    const project = await projectService.getProjectDetails(projectId, organizationId);
    sendSuccess(res, {
      ...project,
      userProjectRole: req.projectMember?.role
    });
  };

  update = async (req: ProjectScopedRequest, res: Response) => {
    if (!req.user || !req.project) throw new UnauthorizedError();
    const { projectId } = req.params;
    const updated = await projectService.updateProject(
      projectId,
      req.project.organizationId,
      req.body,
      req.user.userId
    );
    sendSuccess(res, updated);
  };

  delete = async (req: ProjectScopedRequest, res: Response) => {
    if (!req.user || !req.project) throw new UnauthorizedError();
    const { projectId } = req.params;
    await projectService.deleteProject(projectId, req.project.organizationId, req.user.userId);
    sendSuccess(res, { message: 'Project deleted successfully' });
  };

  listMembers = async (req: ProjectScopedRequest, res: Response) => {
    const { projectId } = req.params;
    const members = await projectService.listProjectMembers(projectId);
    sendSuccess(res, members);
  };

  addMember = async (req: ProjectScopedRequest, res: Response) => {
    if (!req.user || !req.project) throw new UnauthorizedError();
    const { projectId } = req.params;
    const member = await projectService.addProjectMember(
      projectId,
      req.project.organizationId,
      req.body,
      req.user.userId
    );
    sendSuccess(res, member, 201);
  };

  removeMember = async (req: ProjectScopedRequest, res: Response) => {
    if (!req.user || !req.project) throw new UnauthorizedError();
    const { projectId, memberId } = req.params;
    await projectService.removeProjectMember(
      projectId,
      req.project.organizationId,
      memberId,
      req.user.userId
    );
    sendSuccess(res, { message: 'Project member removed successfully' });
  };

  updateMemberRole = async (req: ProjectScopedRequest, res: Response) => {
    if (!req.user || !req.project) throw new UnauthorizedError();
    const { projectId, memberId } = req.params;
    const { role } = req.body;
    const updated = await projectService.updateProjectMemberRole(
      projectId,
      req.project.organizationId,
      memberId,
      role as ProjectRole,
      req.user.userId
    );
    sendSuccess(res, updated);
  };
}

export const projectController = new ProjectController();
