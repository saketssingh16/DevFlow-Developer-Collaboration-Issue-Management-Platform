import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from '../ai/ai.service.js';
import { DisabledAIProvider, AIProvider } from '../ai/ai.interface.js';
import { prisma } from '../../config/database.js';

describe('AI Service & Provider Resilience Unit Tests', () => {
  const mockIssue = {
    id: 'issue-ai-1',
    projectId: 'proj-1',
    title: 'Fix authentication token expiration race condition',
    description: 'Refresh token rotation occasionally fails when concurrent requests fire simultaneously.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    type: 'BUG',
    reporterId: 'user-1',
    assigneeId: null,
    dueDate: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles successful provider response for summarizeIssue', async () => {
    const mockProvider: AIProvider = {
      summarizeIssue: vi.fn().mockResolvedValue('Concise summary of authentication fix.'),
      generateAcceptanceCriteria: vi.fn(),
      classifyIssue: vi.fn(),
      detectPossibleDuplicate: vi.fn()
    };

    vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(mockIssue as never);

    const service = new AIService(mockProvider);
    const result = await service.summarizeIssue('issue-ai-1');

    expect(result).toBe('Concise summary of authentication fix.');
  });

  it('handles provider timeout gracefully without throwing uncaught error', async () => {
    const mockProvider: AIProvider = {
      summarizeIssue: vi.fn().mockRejectedValue(new Error('AI Provider request timed out')),
      generateAcceptanceCriteria: vi.fn(),
      classifyIssue: vi.fn(),
      detectPossibleDuplicate: vi.fn()
    };

    vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(mockIssue as never);

    const service = new AIService(mockProvider);
    const result = await service.summarizeIssue('issue-ai-1');

    expect(result).toContain('assistance currently unavailable');
  });

  it('handles provider failure gracefully', async () => {
    const mockProvider: AIProvider = {
      summarizeIssue: vi.fn(),
      generateAcceptanceCriteria: vi.fn().mockRejectedValue(new Error('OpenAI API error 500')),
      classifyIssue: vi.fn(),
      detectPossibleDuplicate: vi.fn()
    };

    vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(mockIssue as never);

    const service = new AIService(mockProvider);
    const criteria = await service.generateAcceptanceCriteria('issue-ai-1');

    expect(Array.isArray(criteria)).toBe(true);
    expect(criteria.length).toBeGreaterThan(0);
  });

  it('handles malformed JSON response in classifyIssue gracefully with fallback', async () => {
    const mockProvider: AIProvider = {
      summarizeIssue: vi.fn(),
      generateAcceptanceCriteria: vi.fn(),
      classifyIssue: vi.fn().mockRejectedValue(new Error('Malformed AI response')),
      detectPossibleDuplicate: vi.fn()
    };

    const service = new AIService(mockProvider);
    const classification = await service.classifyIssue('Broken Login', 'Cannot login');

    expect(classification).toEqual({ type: 'TASK', priority: 'MEDIUM', tags: [] });
  });

  it('returns graceful fallback response when AI is unconfigured or disabled', async () => {
    const service = new AIService(new DisabledAIProvider());
    const duplicateRes = await service.detectPossibleDuplicate('proj-1', 'Title', 'Desc');

    expect(duplicateRes).toEqual({ isDuplicate: false, similarityScore: 0 });
  });
});
