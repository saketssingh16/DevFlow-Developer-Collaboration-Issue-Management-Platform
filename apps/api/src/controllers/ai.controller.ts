import { Response } from 'express';
import { aiService } from '../services/ai/ai.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ProjectScopedRequest } from '../middleware/project.middleware.js';
import { BadRequestError } from '../utils/errors.js';

export class AIController {
  summarizeIssue = async (req: ProjectScopedRequest, res: Response) => {
    const { issueId } = req.params;
    const job = await aiService.enqueueIssueJob('summarize', req.project!.organizationId, req.project!.id, issueId, req.user!.userId);
    res.status(202);
    sendSuccess(res, { job, assistance: true });
  };

  generateAcceptanceCriteria = async (req: ProjectScopedRequest, res: Response) => {
    const { issueId } = req.params;
    const job = await aiService.enqueueIssueJob('acceptance_criteria', req.project!.organizationId, req.project!.id, issueId, req.user!.userId);
    res.status(202);
    sendSuccess(res, { job, assistance: true });
  };

  classifyIssue = async (req: ProjectScopedRequest, res: Response) => {
    const { title, description } = req.body;
    if (typeof title !== 'string' || !title.trim() || (description !== undefined && typeof description !== 'string')) {
      throw new BadRequestError('A non-empty title and an optional string description are required');
    }
    const job = await aiService.enqueueProjectJob('classify', req.project!.organizationId, req.project!.id, req.user!.userId, { title, description });
    res.status(202);
    sendSuccess(res, { job, assistance: true });
  };

  detectPossibleDuplicate = async (req: ProjectScopedRequest, res: Response) => {
    const { projectId } = req.params;
    const { title, description } = req.body;
    if (typeof title !== 'string' || !title.trim() || (description !== undefined && typeof description !== 'string')) {
      throw new BadRequestError('A non-empty title and an optional string description are required');
    }
    const job = await aiService.enqueueProjectJob('detect_duplicate', req.project!.organizationId, projectId, req.user!.userId, { title, description });
    res.status(202);
    sendSuccess(res, { job, assistance: true });
  };

  getJob = async (req: ProjectScopedRequest, res: Response) => {
    const job = await aiService.getJob(req.params.jobId, req.project!.id);
    sendSuccess(res, { job, assistance: true });
  };
}

export const aiController = new AIController();
