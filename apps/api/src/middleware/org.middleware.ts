import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { ForbiddenError, BadRequestError } from '../utils/errors.js';
import { OrgRole } from '@devflow/shared';

export interface OrgScopedRequest extends AuthenticatedRequest {
  orgMember?: {
    id: string;
    organizationId: string;
    userId: string;
    role: OrgRole;
  };
}

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  [OrgRole.OWNER]: 5,
  [OrgRole.ADMIN]: 4,
  [OrgRole.MANAGER]: 3,
  [OrgRole.DEVELOPER]: 2,
  [OrgRole.VIEWER]: 1
};

export const requireOrganizationMember = (paramName: string = 'organizationId') => {
  return async (req: OrgScopedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new ForbiddenError('User not authenticated');

      const organizationId = (req.params[paramName] as string) || (req.headers['x-organization-id'] as string) || (req.query.organizationId as string);

      if (!organizationId) throw new BadRequestError('Organization ID is required');

      const member = await organizationRepository.getMember(organizationId, userId);
      if (!member) throw new ForbiddenError('Access denied: You are not a member of this organization');

      req.orgMember = { id: member.id, organizationId: member.organizationId, userId: member.userId, role: member.role as OrgRole };

      next();
    } catch (error) { next(error); }
  };
};

export const requireOrganizationRole = (minRole: OrgRole) => {
  return (req: OrgScopedRequest, res: Response, next: NextFunction) => {
    if (!req.orgMember) {
      throw new ForbiddenError('Organization membership verification required');
    }

    const userRoleWeight = ROLE_HIERARCHY[req.orgMember.role];
    const requiredRoleWeight = ROLE_HIERARCHY[minRole];

    if (userRoleWeight < requiredRoleWeight) {
      throw new ForbiddenError(`Insufficient organization permissions. Minimum role required: ${minRole}`);
    }

    next();
  };
};
