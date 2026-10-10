import { Response, NextFunction } from 'express';
import { OrgScopedRequest } from './org.middleware.js';
import { prisma } from '../config/database.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { ProjectRole, OrgRole } from '@devflow/shared';

export interface ProjectScopedRequest extends OrgScopedRequest {
  project?: {
    id: string;
    organizationId: string;
    name: string;
    key: string;
    status: string;
    ownerId: string;
  };
  projectMember?: {
    id: string;
    projectId: string;
    userId: string;
    role: ProjectRole;
  };
}

const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
  [ProjectRole.LEAD]: 3,
  [ProjectRole.MEMBER]: 2,
  [ProjectRole.VIEWER]: 1
};

export const requireProjectMember = (paramName: string = 'projectId') => {
  return async (req: ProjectScopedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new ForbiddenError('User not authenticated');

      const projectId = req.params[paramName] as string;
      if (!projectId) throw new NotFoundError('Project ID missing from request');

      const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

      if (!project) throw new NotFoundError('Project not found');

    // Verify user belongs to the parent organization
      const orgMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId
        }
      }
    });

      if (!orgMember) throw new ForbiddenError('Access denied: You are not a member of the organization owning this project');

      const projectMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    // Org OWNER and ADMIN have implicit LEAD access to all projects in their org
      const isOrgAdmin = orgMember.role === OrgRole.OWNER || orgMember.role === OrgRole.ADMIN;

      if (!projectMember && !isOrgAdmin) throw new ForbiddenError('Access denied: You are not a member of this project');

      const effectiveRole: ProjectRole = isOrgAdmin
      ? ProjectRole.LEAD
      : (projectMember?.role as ProjectRole) || ProjectRole.VIEWER;

      req.project = project;
      req.projectMember = {
      id: projectMember?.id || 'admin-implicit',
      projectId,
      userId,
      role: effectiveRole
    };

      next();
    } catch (error) { next(error); }
  };
};

export const requireProjectRole = (minRole: ProjectRole) => {
  return (req: ProjectScopedRequest, res: Response, next: NextFunction) => {
    if (!req.projectMember) {
      throw new ForbiddenError('Project membership verification required');
    }

    const userWeight = PROJECT_ROLE_HIERARCHY[req.projectMember.role];
    const minWeight = PROJECT_ROLE_HIERARCHY[minRole];

    if (userWeight < minWeight) {
      throw new ForbiddenError(`Insufficient project permissions. Minimum required project role: ${minRole}`);
    }

    next();
  };
};
