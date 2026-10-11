import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';
import { ConsoleEmailProvider } from '../services/console-email.provider.js';
import { EmailProvider } from '../services/console-email.provider.js';
import { ResendEmailProvider } from '../services/resend-email.provider.js';

const logger = pino({ name: 'worker:email' });
function createEmailProvider(): EmailProvider {
  if (process.env.EMAIL_PROVIDER === 'resend') {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      logger.warn('EMAIL_PROVIDER=resend is configured without RESEND_API_KEY or EMAIL_FROM; emails will only be logged');
      return new ConsoleEmailProvider();
    }
    return new ResendEmailProvider(apiKey, from);
  }
  return new ConsoleEmailProvider();
}

const emailProvider = createEmailProvider();

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character);
}

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
        case 'email_verification': {
          const code = String(job.data.verificationCode || '');
          if (!/^\d{6}$/.test(code)) throw new Error('Email verification job has an invalid code');
          const name = escapeHtml(String(job.data.name || 'there'));
          await emailProvider.send({
            to: String(job.data.email),
            subject: 'Your DevFlow verification code',
            text: `Hello ${String(job.data.name || 'there')}, your DevFlow verification code is ${code}. It expires in 10 minutes.`,
            html: `<p>Hello ${name},</p><p>Your DevFlow verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not create a DevFlow account, you can ignore this email.</p>`
          });
          break;
        }
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
