import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';
import { PrismaClient } from '@prisma/client';

const logger = pino({ name: 'worker:cleanup' });
const prisma = new PrismaClient();

const redisConnection = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null }) : new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
});

export function startCleanupWorker() {
  const worker = new Worker(
    'cleanup',
    async (job: Job) => {
      logger.info({ jobId: job.id, name: job.name }, 'Processing cleanup job');

      if (job.name === 'purge_expired_sessions') {
        const deletedSessions = await prisma.session.deleteMany({
          where: {
            OR: [
              { expiresAt: { lt: new Date() } },
              { isRevoked: true }
            ]
          }
        });
        logger.info({ count: deletedSessions.count }, 'Purged expired & revoked sessions');
        return { count: deletedSessions.count };
      }

      return { processed: true };
    },
    { connection: redisConnection }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Cleanup job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Cleanup job failed');
  });

  return worker;
}
