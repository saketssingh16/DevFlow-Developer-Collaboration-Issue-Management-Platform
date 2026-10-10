import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';
import { ConsoleEmailProvider } from '../services/console-email.provider.js';

const logger = pino({ name: 'worker:email' });
const emailProvider = new ConsoleEmailProvider();

const redisConnection = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null }) : new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
});

export function startEmailWorker() {
  const worker = new Worker(
    'email',
    async (job: Job) => {
      logger.info({ jobId: job.id, name: job.name }, 'Processing email job');

      switch (job.name) {
        case 'welcome_email':
          await emailProvider.send({ to: String(job.data.email), subject: 'Welcome to DevFlow', html: `<p>Welcome ${String(job.data.name || '')}</p>` });
          break;
        case 'password_reset':
          await emailProvider.send({ to: String(job.data.email), subject: 'Reset your DevFlow password', html: '<p>A password reset was requested.</p>' });
          break;
        case 'organization_invitation':
          await emailProvider.send({ to: String(job.data.email), subject: 'DevFlow organization invitation', html: `<p>You have been invited to DevFlow.</p><p><a href="${String(job.data.invitationUrl || '')}">Accept invitation</a></p>` });
          break;
        default:
          logger.warn(`Unknown email job type: ${job.name}`);
      }

      return { processed: true, timestamp: new Date() };
    },
    { connection: redisConnection }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Email job completed successfully');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Email job failed execution');
  });

  return worker;
}
