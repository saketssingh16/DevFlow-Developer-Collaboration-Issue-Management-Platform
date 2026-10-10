import { Queue, QueueOptions } from 'bullmq';
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';

const defaultJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000 // 2s, 4s, 8s, 16s, 32s
  },
  removeOnComplete: {
    age: 24 * 3600, // keep completed jobs for 24 hours
    count: 1000
  },
  removeOnFail: {
    age: 7 * 24 * 3600 // keep failed jobs for 7 days
  }
};

const queueConnectionOptions: QueueOptions = {
  connection: redis,
  defaultJobOptions
};

export const emailQueue = new Queue('email', queueConnectionOptions);
export const notificationQueue = new Queue('notifications', queueConnectionOptions);
export const aiQueue = new Queue('ai', queueConnectionOptions);
export const reportQueue = new Queue('reports', queueConnectionOptions);
export const cleanupQueue = new Queue('cleanup', queueConnectionOptions);

export async function enqueueEmailJob(type: string, payload: Record<string, unknown>) {
  try {
    await emailQueue.add(type, payload);
  } catch (err) {
    logger.error({ err, type }, 'Failed to enqueue email job');
  }
}

export async function enqueueNotificationJob(type: string, payload: Record<string, unknown>) {
  try {
    await notificationQueue.add(type, payload);
  } catch (err) {
    logger.error({ err, type }, 'Failed to enqueue notification job');
  }
}

export async function enqueueAIJob(type: string, payload: Record<string, unknown>, jobId: string) {
  await aiQueue.add(type, payload, { jobId });
}
