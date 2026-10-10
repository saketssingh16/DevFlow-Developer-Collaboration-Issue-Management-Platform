import {
  AIProvider,
  ClassifyIssueResult,
  DuplicateDetectionResult
} from './ai.interface.js';
import { logger } from '../../config/logger.js';

type OpenAIResponse = { choices?: Array<{ message?: { content?: string } }> };
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unknown AI provider error';

export class OpenAIAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string, timeoutMs: number = 8000): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key missing');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
      }

      const data = await response.json() as OpenAIResponse;
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('AI Provider request timed out');
      }
      throw err;
    }
  }

  async summarizeIssue(title: string, description?: string | null): Promise<string> {
    const systemPrompt = 'You are an expert software engineering assistant. Provide a concise 2-sentence summary of the following issue.';
    const userPrompt = `Issue Title: ${title}\nDescription: ${description || 'N/A'}`;
    const result = await this.callOpenAI(systemPrompt, userPrompt);
    return result.trim();
  }

  async generateAcceptanceCriteria(title: string, description?: string | null): Promise<string[]> {
    const systemPrompt = 'You are a product owner. Generate 3 to 5 clear acceptance criteria in plain text for the given issue. Output each criterion on a new line starting with "- ".';
    const userPrompt = `Issue Title: ${title}\nDescription: ${description || 'N/A'}`;
    const result = await this.callOpenAI(systemPrompt, userPrompt);
    
    return result
      .split('\n')
      .map((line) => line.replace(/^-\s*/, '').trim())
      .filter((line) => line.length > 0);
  }

  async classifyIssue(title: string, description?: string | null): Promise<ClassifyIssueResult> {
    const systemPrompt = `Analyze the issue and respond ONLY with a valid JSON object with format: {"type": "BUG"|"TASK"|"FEATURE"|"IMPROVEMENT", "priority": "LOW"|"MEDIUM"|"HIGH"|"URGENT", "tags": string[]}`;
    const userPrompt = `Title: ${title}\nDescription: ${description || 'N/A'}`;
    const responseText = await this.callOpenAI(systemPrompt, userPrompt);

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Malformed JSON response from AI provider');
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      return {
        type: typeof parsed.type === 'string' ? parsed.type : 'TASK',
        priority: typeof parsed.priority === 'string' ? parsed.priority : 'MEDIUM',
        tags: Array.isArray(parsed.tags) ? parsed.tags.filter((tag): tag is string => typeof tag === 'string') : []
      };
    } catch (err) {
      logger.warn({ responseText, err: errorMessage(err) }, 'Failed to parse AI classification JSON');
      throw new Error('Malformed AI response');
    }
  }

  async detectPossibleDuplicate(
    targetTitle: string,
    targetDescription: string | null | undefined,
    existingIssues: Array<{ id: string; title: string; description?: string | null }>
  ): Promise<DuplicateDetectionResult> {
    if (existingIssues.length === 0) {
      return { isDuplicate: false, similarityScore: 0 };
    }

    const issuesContext = existingIssues
      .slice(0, 10)
      .map((i) => `ID: ${i.id} | Title: ${i.title}`)
      .join('\n');

    const systemPrompt = `Analyze if the target issue is a duplicate of any existing issue. Respond ONLY in JSON format: {"isDuplicate": boolean, "duplicateIssueId": string|null, "similarityScore": number (0-1), "reason": string}`;
    const userPrompt = `Target Title: ${targetTitle}\nTarget Description: ${targetDescription || 'N/A'}\n\nExisting Issues:\n${issuesContext}`;

    try {
      const responseText = await this.callOpenAI(systemPrompt, userPrompt);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { isDuplicate: false, similarityScore: 0 };
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      return {
        isDuplicate: Boolean(parsed.isDuplicate),
        duplicateIssueId: typeof parsed.duplicateIssueId === 'string' ? parsed.duplicateIssueId : undefined,
        similarityScore: typeof parsed.similarityScore === 'number' ? parsed.similarityScore : 0,
        reason: typeof parsed.reason === 'string' ? parsed.reason : undefined
      };
    } catch {
      return { isDuplicate: false, similarityScore: 0 };
    }
  }
}
