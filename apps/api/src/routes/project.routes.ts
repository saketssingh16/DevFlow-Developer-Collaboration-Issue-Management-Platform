import { Router } from 'express';
import { projectController } from '../controllers/project.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validation.js';
import { requireAuthenticatedUser } from '../middleware/auth.middleware.js';
import { requireOrganizationMember, requireOrganizationRole } from '../middleware/org.middleware.js';
import { requireProjectMember, requireProjectRole } from '../middleware/project.middleware.js';
import { OrgRole, ProjectRole } from '@devflow/shared';
import { createProjectSchema, updateProjectSchema, addProjectMemberSchema, createIssueSchema, updateIssueSchema, createCommentSchema } from '@devflow/validation';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { attachmentController } from '../controllers/attachment.controller.js';
import { attachmentUpload, requireAttachmentsEnabled } from '../middleware/upload.js';
import { issueController } from '../controllers/issue.controller.js';

// Router 1: Organization-scoped project router (/api/v1/organizations/:organizationId/projects)
export const organizationProjectRouter = Router({ mergeParams: true });

organizationProjectRouter.use(requireAuthenticatedUser);

organizationProjectRouter.post(
  '/',
  requireOrganizationMember('organizationId'),
  requireOrganizationRole(OrgRole.ADMIN),
  validateBody(createProjectSchema),
  asyncHandler(projectController.create)
);

organizationProjectRouter.get(
  '/',
  requireOrganizationMember('organizationId'),
  requireOrganizationRole(OrgRole.VIEWER),
  asyncHandler(projectController.listOrganizationProjects)
);

// Router 2: Direct project resource router (/api/v1/projects)
export const projectRouter = Router();

projectRouter.use(requireAuthenticatedUser);

projectRouter.get(
  '/:projectId',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.VIEWER),
  asyncHandler(projectController.getDetails)
);

projectRouter.get(
  '/:projectId/activity',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.VIEWER),
  asyncHandler(dashboardController.getProjectActivity)
);

projectRouter.get('/:projectId/issues', requireProjectMember('projectId'), requireProjectRole(ProjectRole.VIEWER), asyncHandler(issueController.list));
projectRouter.post('/:projectId/issues', requireProjectMember('projectId'), requireProjectRole(ProjectRole.MEMBER), validateBody(createIssueSchema.omit({ projectId: true })), asyncHandler(issueController.create));
projectRouter.get('/:projectId/issues/:issueId', requireProjectMember('projectId'), requireProjectRole(ProjectRole.VIEWER), asyncHandler(issueController.get));
projectRouter.patch('/:projectId/issues/:issueId', requireProjectMember('projectId'), requireProjectRole(ProjectRole.MEMBER), validateBody(updateIssueSchema), asyncHandler(issueController.update));
projectRouter.post('/:projectId/issues/:issueId/comments', requireProjectMember('projectId'), requireProjectRole(ProjectRole.MEMBER), validateBody(createCommentSchema), asyncHandler(issueController.comment));

projectRouter.get(
  '/:projectId/issues/:issueId/attachments',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.VIEWER),
  asyncHandler(attachmentController.list)
);

projectRouter.post(
  '/:projectId/issues/:issueId/attachments',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.MEMBER),
  requireAttachmentsEnabled,
  attachmentUpload.single('file'),
  asyncHandler(attachmentController.upload)
);

projectRouter.get(
  '/:projectId/issues/:issueId/attachments/:attachmentId/download',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.VIEWER),
  asyncHandler(attachmentController.download)
);

projectRouter.delete(
  '/:projectId/issues/:issueId/attachments/:attachmentId',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.MEMBER),
  asyncHandler(attachmentController.delete)
);

projectRouter.patch(
  '/:projectId',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.LEAD),
  validateBody(updateProjectSchema),
  asyncHandler(projectController.update)
);

projectRouter.delete(
  '/:projectId',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.LEAD),
  asyncHandler(projectController.delete)
);

projectRouter.get(
  '/:projectId/members',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.VIEWER),
  asyncHandler(projectController.listMembers)
);

projectRouter.post(
  '/:projectId/members',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.LEAD),
  validateBody(addProjectMemberSchema),
  asyncHandler(projectController.addMember)
);

projectRouter.delete(
  '/:projectId/members/:memberId',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.LEAD),
  asyncHandler(projectController.removeMember)
);

projectRouter.patch(
  '/:projectId/members/:memberId/role',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.LEAD),
  asyncHandler(projectController.updateMemberRole)
);
