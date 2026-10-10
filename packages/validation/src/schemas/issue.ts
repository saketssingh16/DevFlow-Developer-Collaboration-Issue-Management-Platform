import { z } from 'zod';
import { IssueType, IssuePriority, IssueStatus } from '@devflow/shared';

export const createIssueSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(10000).optional(),
  type: z.nativeEnum(IssueType).default(IssueType.TASK),
  priority: z.nativeEnum(IssuePriority).default(IssuePriority.MEDIUM),
  status: z.nativeEnum(IssueStatus).default(IssueStatus.BACKLOG),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  labelIds: z.array(z.string().uuid()).optional()
});

export const updateIssueSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).nullable().optional(),
  type: z.nativeEnum(IssueType).optional(),
  priority: z.nativeEnum(IssuePriority).optional(),
  status: z.nativeEnum(IssueStatus).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  labelIds: z.array(z.string().uuid()).optional(),
  version: z.number().int().nonnegative('Version for optimistic concurrency control is required for updates').optional()
});

export const issueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(IssueStatus).optional(),
  priority: z.nativeEnum(IssuePriority).optional(),
  type: z.nativeEnum(IssueType).optional(),
  assigneeId: z.string().uuid().optional(),
  reporterId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  labelId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'dueDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment body cannot be empty').max(5000)
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type IssueQueryInput = z.infer<typeof issueQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
