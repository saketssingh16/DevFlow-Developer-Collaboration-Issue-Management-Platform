import { z } from 'zod';
import { ProjectRole } from '@devflow/shared';

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100),
  key: z
    .string()
    .min(2, 'Project key must be 2 to 10 characters')
    .max(10)
    .regex(/^[A-Z0-9]+$/, 'Project key must be uppercase letters and numbers only'),
  description: z.string().max(1000).optional()
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional()
});

export const addProjectMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.nativeEnum(ProjectRole)
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
