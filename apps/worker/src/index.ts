import pino from 'pino';
import dotenv from 'dotenv';
import { startEmailWorker } from './workers/email.worker.js';
import { startNotificationWorker } from './workers/notification.worker.js';
import { startCleanupWorker } from './workers/cleanup.worker.js';
import { startAIWorker } from './workers/ai.worker.js';

dotenv.config();

const logger = pino({
  name: 'devflow-worker',
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime
});

async function main() {
  logger.info('DevFlow Worker Service initializing BullMQ queue processors...');

  const emailWorker = startEmailWorker();
  const notificationWorker = startNotificationWorker();
  const cleanupWorker = startCleanupWorker();
  const aiWorker = startAIWorker();

  logger.info('BullMQ workers running and actively listening for jobs (email, notifications, AI, cleanup).');

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully closing BullMQ workers...`);
    await Promise.all([
      emailWorker.close(),
      notificationWorker.close(),
      cleanupWorker.close(),
      aiWorker.close()
    ]);
    logger.info('All BullMQ workers shut down gracefully.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Worker process fatal error');
  process.exit(1);
});
