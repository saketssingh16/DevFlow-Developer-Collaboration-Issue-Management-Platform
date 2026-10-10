import { Router } from 'express';
import { aiController } from '../controllers/ai.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuthenticatedUser } from '../middleware/auth.middleware.js';
import { requireProjectMember, requireProjectRole } from '../middleware/project.middleware.js';
import { ProjectRole } from '@devflow/shared';

const router = Router({ mergeParams: true });

router.use(requireAuthenticatedUser);

router.post(
  '/issues/:issueId/summarize',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.VIEWER),
  asyncHandler(aiController.summarizeIssue)
);

router.get(
  '/jobs/:jobId',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.VIEWER),
  asyncHandler(aiController.getJob)
);

router.post(
  '/issues/:issueId/acceptance-criteria',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.VIEWER),
  asyncHandler(aiController.generateAcceptanceCriteria)
);

router.post(
  '/classify',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.VIEWER),
  asyncHandler(aiController.classifyIssue)
);

router.post(
  '/detect-duplicate',
  requireProjectMember('projectId'),
  requireProjectRole(ProjectRole.VIEWER),
  asyncHandler(aiController.detectPossibleDuplicate)
);

export const aiRouter = router;
