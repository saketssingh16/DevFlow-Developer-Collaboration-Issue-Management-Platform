import { Response } from 'express';
import { organizationService } from '../services/organization.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { OrgScopedRequest } from '../middleware/org.middleware.js';
import { UnauthorizedError } from '../utils/errors.js';

export class OrganizationController {
  create = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const result = await organizationService.createOrganization(req.body, req.user.userId);
    sendSuccess(res, result, 201);
  };

  listMyOrganizations = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const result = await organizationService.getUserOrganizations(req.user.userId);
    sendSuccess(res, result);
  };

  getDetails = async (req: OrgScopedRequest, res: Response) => {
    const { organizationId } = req.params;
    const org = await organizationService.getOrganizationDetails(organizationId);
    sendSuccess(res, {
      ...org,
      userRole: req.orgMember?.role
    });
  };

  update = async (req: OrgScopedRequest, res: Response) => {
    const { organizationId } = req.params;
    if (!req.user) throw new UnauthorizedError();
    const result = await organizationService.updateOrganization(organizationId, req.body, req.user.userId);
    sendSuccess(res, result);
  };

  delete = async (req: OrgScopedRequest, res: Response) => {
    const { organizationId } = req.params;
    if (!req.user) throw new UnauthorizedError();
    await organizationService.deleteOrganization(organizationId, req.user.userId);
    sendSuccess(res, { message: 'Organization archived successfully' });
  };

  listMembers = async (req: OrgScopedRequest, res: Response) => {
    const { organizationId } = req.params;
    const members = await organizationService.listMembers(organizationId);
    sendSuccess(res, members);
  };

  inviteMember = async (req: OrgScopedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const { organizationId } = req.params;
    const invitation = await organizationService.inviteMember(organizationId, req.body, req.user.userId);
    sendSuccess(res, invitation, 201);
  };

  acceptInvitation = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const result = await organizationService.acceptInvitation(req.params.token, req.user.userId);
    sendSuccess(res, result);
  };

  listInvitations = async (req: OrgScopedRequest, res: Response) => {
    const { organizationId } = req.params;
    const invitations = await organizationService.listInvitations(organizationId);
    sendSuccess(res, invitations);
  };

  removeMember = async (req: OrgScopedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const { organizationId, memberId } = req.params;
    await organizationService.removeMember(organizationId, memberId, req.user.userId);
    sendSuccess(res, { message: 'Member removed successfully' });
  };

  updateMemberRole = async (req: OrgScopedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const { organizationId, memberId } = req.params;
    const updated = await organizationService.updateMemberRole(organizationId, memberId, req.body, req.user.userId);
    sendSuccess(res, updated);
  };
}

export const organizationController = new OrganizationController();
