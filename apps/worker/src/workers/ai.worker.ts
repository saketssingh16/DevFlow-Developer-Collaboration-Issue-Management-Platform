import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';
import { Prisma, PrismaClient } from '@prisma/client';

const logger = pino({ name: 'worker:ai' });
const prisma = new PrismaClient();
const redisConnection = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null }) : new Redis({ host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379', 10), password: process.env.REDIS_PASSWORD || undefined, maxRetriesPerRequest: null });
type JobInput = { title: string; description?: string | null };
type AIResponse = { content: string; inputTokens?: number; outputTokens?: number };

function asInput(value: unknown): JobInput {
  if (!value || typeof value !== 'object' || typeof (value as JobInput).title !== 'string') throw new Error('Invalid AI job input');
  return value as JobInput;
}

async function callOpenAI(system: string, user: string): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (process.env.AI_ENABLED !== 'true' || !apiKey) throw new Error('AI_PROVIDER_UNAVAILABLE');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.2, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }), signal: controller.signal
    });
    if (!response.ok) throw new Error(`AI_PROVIDER_HTTP_${response.status}`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('AI_PROVIDER_MALFORMED_RESPONSE');
    return { content, inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens };
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw new Error('AI_PROVIDER_TIMEOUT');
    throw error;
  } finally { clearTimeout(timer); }
}

function parseJson(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI_PROVIDER_MALFORMED_RESPONSE');
  try { return JSON.parse(match[0]) as Record<string, unknown>; } catch { throw new Error('AI_PROVIDER_MALFORMED_RESPONSE'); }
}

async function processAIJob(aiJobId: string) {
  const aiJob = await prisma.aIJob.findUnique({ where: { id: aiJobId } });
  if (!aiJob) throw new Error('AI job record not found');
  if (aiJob.status === 'COMPLETED') return aiJob.result;
  const startedAt = new Date();
  await prisma.aIJob.update({ where: { id: aiJobId }, data: { status: 'PROCESSING', startedAt, errorCode: null, errorMessage: null } });
  try {
    let result: Record<string, unknown>;
    let tokenUsage: Pick<AIResponse, 'inputTokens' | 'outputTokens'> = {};
    if (aiJob.operation === 'summarize' || aiJob.operation === 'acceptance_criteria') {
      if (!aiJob.issueId) throw new Error('Invalid issue AI job');
      const issue = await prisma.issue.findFirst({ where: { id: aiJob.issueId, projectId: aiJob.projectId, deletedAt: null } });
      if (!issue) throw new Error('Issue no longer exists in this project');
      const prompt = `Issue Title: ${issue.title}\nDescription: ${issue.description || 'N/A'}`;
      if (aiJob.operation === 'summarize') {
        const response = await callOpenAI('You are an engineering assistant. Give a concise, factual two-sentence issue summary. Do not make product decisions.', prompt);
        tokenUsage = response;
        result = { summary: response.content };
      }
      else {
        const response = await callOpenAI('You are a product owner. Produce 3-5 testable acceptance criteria, one per line, each beginning with "- ".', prompt);
        tokenUsage = response;
        const text = response.content;
        result = { criteria: text.split('\n').map((line) => line.replace(/^-\s*/, '').trim()).filter(Boolean) };
      }
    } else {
      const input = asInput(aiJob.input);
      if (aiJob.operation === 'classify') {
        const response = await callOpenAI('Return only JSON: {"type":"BUG|TASK|FEATURE|IMPROVEMENT","priority":"LOW|MEDIUM|HIGH|URGENT","tags":string[]}.', `Title: ${input.title}\nDescription: ${input.description || 'N/A'}`);
        tokenUsage = response;
        const text = response.content;
        const parsed = parseJson(text);
        result = { type: ['BUG', 'TASK', 'FEATURE', 'IMPROVEMENT'].includes(String(parsed.type)) ? parsed.type as string : 'TASK', priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(String(parsed.priority)) ? parsed.priority as string : 'MEDIUM', tags: Array.isArray(parsed.tags) ? parsed.tags.filter((tag): tag is string => typeof tag === 'string') : [] };
      } else if (aiJob.operation === 'detect_duplicate') {
        const issues = await prisma.issue.findMany({ where: { projectId: aiJob.projectId, deletedAt: null }, select: { id: true, title: true, description: true }, orderBy: { createdAt: 'desc' }, take: 20 });
        const context = issues.slice(0, 10).map((issue) => `ID: ${issue.id} | Title: ${issue.title} | Description: ${issue.description || 'N/A'}`).join('\n');
        const response = await callOpenAI('Return only JSON: {"isDuplicate":boolean,"duplicateIssueId":string|null,"similarityScore":number,"reason":string}. Only select an ID provided in the existing list.', `Target title: ${input.title}\nTarget description: ${input.description || 'N/A'}\n\nExisting issues:\n${context}`);
        tokenUsage = response;
        const text = response.content;
        const parsed = parseJson(text);
        const duplicateIssueId = typeof parsed.duplicateIssueId === 'string' && issues.some((issue) => issue.id === parsed.duplicateIssueId) ? parsed.duplicateIssueId : null;
        result = { isDuplicate: Boolean(parsed.isDuplicate) && Boolean(duplicateIssueId), duplicateIssueId, similarityScore: typeof parsed.similarityScore === 'number' ? Math.max(0, Math.min(1, parsed.similarityScore)) : 0, reason: typeof parsed.reason === 'string' ? parsed.reason : undefined };
      } else throw new Error(`Unsupported AI operation: ${aiJob.operation}`);
    }
    const completedAt = new Date();
    await prisma.aIJob.update({ where: { id: aiJobId }, data: { status: 'COMPLETED', result: result as Prisma.InputJsonValue, durationMs: completedAt.getTime() - startedAt.getTime(), inputTokens: tokenUsage.inputTokens, outputTokens: tokenUsage.outputTokens, completedAt } });
    logger.info({ aiJobId, operation: aiJob.operation }, 'AI job completed');
    return result;
  } catch (error) {
    const completedAt = new Date(); const message = error instanceof Error ? error.message : 'Unknown AI provider failure';
    await prisma.aIJob.update({ where: { id: aiJobId }, data: { status: 'FAILED', errorCode: message.slice(0, 64), errorMessage: message, durationMs: completedAt.getTime() - startedAt.getTime(), completedAt } });
    throw error;
  }
}

export function startAIWorker() {
  const worker = new Worker('ai', async (job: Job<{ aiJobId: string }>) => {
    logger.info({ jobId: job.id, aiJobId: job.data.aiJobId, name: job.name }, 'Processing AI job');
    return processAIJob(job.data.aiJobId);
  }, { connection: redisConnection });
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'AI job failed'));
  return worker;
}
