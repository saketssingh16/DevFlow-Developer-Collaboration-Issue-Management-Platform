export interface ClassifyIssueResult {
  type: string;
  priority: string;
  tags: string[];
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  duplicateIssueId?: string;
  similarityScore: number;
  reason?: string;
}

export interface AIProvider {
  summarizeIssue(title: string, description?: string | null): Promise<string>;
  generateAcceptanceCriteria(title: string, description?: string | null): Promise<string[]>;
  classifyIssue(title: string, description?: string | null): Promise<ClassifyIssueResult>;
  detectPossibleDuplicate(
    targetTitle: string,
    targetDescription: string | null | undefined,
    existingIssues: Array<{ id: string; title: string; description?: string | null }>
  ): Promise<DuplicateDetectionResult>;
}

export class DisabledAIProvider implements AIProvider {
  async summarizeIssue(): Promise<string> {
    throw new Error('AI Assistant is currently disabled or unconfigured.');
  }
  async generateAcceptanceCriteria(): Promise<string[]> {
    throw new Error('AI Assistant is currently disabled or unconfigured.');
  }
  async classifyIssue(): Promise<ClassifyIssueResult> {
    throw new Error('AI Assistant is currently disabled or unconfigured.');
  }
  async detectPossibleDuplicate(): Promise<DuplicateDetectionResult> {
    return { isDuplicate: false, similarityScore: 0 };
  }
}
