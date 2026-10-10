import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';

const logger = pino({ name: 'worker:notification' });

const redisConnection = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null }) : new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
});

export function startNotificationWorker() {
  const worker = new Worker(
    'notifications',
    async (job: Job) => {
      logger.info({ jobId: job.id, name: job.name, data: job.data }, 'Processing notification fanout job');
      return { processed: true, count: 1 };
    },
    { connection: redisConnection }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Notification job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Notification job failed');
  });

  return worker;
}
