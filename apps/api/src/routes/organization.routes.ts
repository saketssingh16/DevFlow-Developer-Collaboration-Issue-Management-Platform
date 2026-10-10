import { Router } from 'express';
import { organizationController } from '../controllers/organization.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validation.js';
import { requireAuthenticatedUser } from '../middleware/auth.middleware.js';
import { requireOrganizationMember, requireOrganizationRole } from '../middleware/org.middleware.js';
import { OrgRole } from '@devflow/shared';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { issueController } from '../controllers/issue.controller.js';
import {
  createOrgSchema,
  updateOrgSchema,
  inviteMemberSchema,
  updateMemberRoleSchema
} from '@devflow/validation';

const router = Router();

router.use(requireAuthenticatedUser);

router.post('/', validateBody(createOrgSchema), asyncHandler(organizationController.create));
router.get('/', asyncHandler(organizationController.listMyOrganizations));

router.post('/invitations/:token/accept', asyncHandler(organizationController.acceptInvitation));

router.get('/:organizationId/my-issues', requireOrganizationMember('organizationId'), requireOrganizationRole(OrgRole.VIEWER), asyncHandler(issueController.myTasks));

router.get(
  '/:organizationId',
  requireOrganizationMember('organizationId'),
  requireOrganizationRole(OrgRole.VIEWER),
  asyncHandler(organizationController.getDetails)
);

router.get(
  '/:organizationId/dashboard',
  requireOrganizationMember('organizationId'),
  requireOrganizationRole(OrgRole.VIEWER),
  asyncHandler(dashboardController.getOrganizationDashboard)
);

router.get(
  '/:organizationId/activity',
  requireOrganizationMember('organizationId'),
  requireOrganizationRole(OrgRole.VIEWER),
  asyncHandler(dashboardController.getOrganizationActivity)
);

router.patch(
  '/:organizationId',
  requireOrganizationMember('organizationId'),
  requireOrganizationRole(OrgRole.ADMIN),
  validateBody(updateOrgSchema),
  asyncHandler(organizationController.update)
);

router.delete(
  '/:organizationId',
  requireOrganizationMember('organizationId'),
  requireOrganizationRole(OrgRole.OWNER),
  asyncHandler(organizationController.delete)
);

router.get(
  '/:organizationId/members',
  requireOrganizationMember('organizationId'),
  requireOrganizationRole(OrgRole.VIEWER),
  asyncHandler(organizationController.listMembers)
);

router.post(
  '/:organizationId/invitations',
  requireOrganizationMember('organizationId'),
  requireOrganizationRole(OrgRole.ADMIN),
  validateBody(inviteMemberSchema),
  asyncHandler(organizationController.inviteMember)
);

router.get(
  '/:organizationId/invitations',
  requireOrganizationMember('organizationId'),
  requireOrganizationRole(OrgRole.ADMIN),
  asyncHandler(organizationController.listInvitations)
);

router.delete(
  '/:organizationId/members/:memberId',
  requireOrganizationMember('organizationId'),
  requireOrganizationRole(OrgRole.ADMIN),
  asyncHandler(organizationController.removeMember)
);

router.patch(
  '/:organizationId/members/:memberId/role',
  requireOrganizationMember('organizationId'),
  requireOrganizationRole(OrgRole.OWNER),
  validateBody(updateMemberRoleSchema),
  asyncHandler(organizationController.updateMemberRole)
);

export const organizationRouter = router;
