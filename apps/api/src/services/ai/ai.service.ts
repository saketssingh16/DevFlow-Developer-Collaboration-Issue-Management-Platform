import { AIProvider, DisabledAIProvider } from './ai.interface.js';
import { OpenAIAIProvider } from './openai.provider.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../utils/errors.js';
import { enqueueAIJob } from '../../jobs/queues.js';
import { randomUUID } from 'node:crypto';

export type AIOperation = 'summarize' | 'acceptance_criteria' | 'classify' | 'detect_duplicate';

export class AIService {
  private provider: AIProvider;

  constructor(customProvider?: AIProvider) {
    if (customProvider) {
      this.provider = customProvider;
    } else if (env.AI_ENABLED && env.OPENAI_API_KEY) {
      this.provider = new OpenAIAIProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL || 'gpt-4o-mini');
    } else {
      this.provider = new DisabledAIProvider();
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown AI provider error';
  }

  async summarizeIssue(issueId: string): Promise<string> {
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) throw new Error('Issue not found');

    const startTime = Date.now();
    try {
      const summary = await this.provider.summarizeIssue(issue.title, issue.description);
      const durationMs = Date.now() - startTime;
      logger.info({ issueId, durationMs, provider: 'openai', action: 'summarize' }, 'AI issue summarization completed');
      return summary;
    } catch (err) {
      logger.warn({ issueId, err: this.errorMessage(err) }, 'AI summarization failed or disabled');
      return 'AI assistance currently unavailable. Please review issue description manually.';
    }
  }

  async generateAcceptanceCriteria(issueId: string): Promise<string[]> {
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) throw new Error('Issue not found');

    const startTime = Date.now();
    try {
      const criteria = await this.provider.generateAcceptanceCriteria(issue.title, issue.description);
      const durationMs = Date.now() - startTime;
      logger.info({ issueId, durationMs, action: 'acceptance_criteria' }, 'AI acceptance criteria generated');
      return criteria;
    } catch (err) {
      logger.warn({ issueId, err: this.errorMessage(err) }, 'AI acceptance criteria generation failed');
      return ['Verify feature behavior aligns with design requirements.'];
    }
  }

  async classifyIssue(title: string, description?: string | null) {
    try {
      return await this.provider.classifyIssue(title, description);
    } catch (err) {
      logger.warn({ title, err: this.errorMessage(err) }, 'AI issue classification fallback used');
      return { type: 'TASK', priority: 'MEDIUM', tags: [] };
    }
  }

  async detectPossibleDuplicate(projectId: string, title: string, description?: string | null) {
    try {
      const existingIssues = await prisma.issue.findMany({
        where: { projectId, deletedAt: null },
        select: { id: true, title: true, description: true },
        take: 20,
        orderBy: { createdAt: 'desc' }
      });

      return await this.provider.detectPossibleDuplicate(title, description, existingIssues);
    } catch (err) {
      logger.warn({ projectId, err: this.errorMessage(err) }, 'AI duplicate detection fallback used');
      return { isDuplicate: false, similarityScore: 0 };
    }
  }

  async enqueueIssueJob(
    operation: Extract<AIOperation, 'summarize' | 'acceptance_criteria'>,
    organizationId: string,
    projectId: string,
    issueId: string,
    requestedById: string
  ) {
    const issue = await prisma.issue.findFirst({ where: { id: issueId, projectId, deletedAt: null }, select: { id: true } });
    if (!issue) throw new NotFoundError('Issue not found in this project');
    return this.createAndEnqueue(operation, { organizationId, projectId, issueId, requestedById });
  }

  async enqueueProjectJob(
    operation: Extract<AIOperation, 'classify' | 'detect_duplicate'>,
    organizationId: string,
    projectId: string,
    requestedById: string,
    input: { title: string; description?: string | null }
  ) {
    return this.createAndEnqueue(operation, { organizationId, projectId, requestedById, input });
  }

  private async createAndEnqueue(
    operation: AIOperation,
    data: { organizationId: string; projectId: string; issueId?: string; requestedById: string; input?: { title: string; description?: string | null } }
  ) {
    const id = randomUUID();
    const job = await prisma.aIJob.create({
      data: {
        id,
        operation,
        organizationId: data.organizationId,
        projectId: data.projectId,
        issueId: data.issueId,
        requestedById: data.requestedById,
        input: data.input ? { title: data.input.title, description: data.input.description ?? null } : undefined,
        provider: env.AI_ENABLED && env.OPENAI_API_KEY ? env.AI_PROVIDER : 'disabled',
        model: env.AI_ENABLED && env.OPENAI_API_KEY ? env.OPENAI_MODEL : undefined
      }
    });

    try {
      await enqueueAIJob(operation, { aiJobId: id }, id);
    } catch (err) {
      await prisma.aIJob.update({
        where: { id },
        data: { status: 'FAILED', errorCode: 'ENQUEUE_FAILED', errorMessage: 'Unable to queue AI work', completedAt: new Date() }
      });
      logger.error({ err, aiJobId: id, operation }, 'Failed to enqueue AI job');
      throw err;
    }

    return job;
  }

  async getJob(jobId: string, projectId: string) {
    const job = await prisma.aIJob.findFirst({ where: { id: jobId, projectId } });
    if (!job) throw new NotFoundError('AI job not found');
    return job;
  }
}

export const aiService = new AIService();
