import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase } from './config/database.js';
import { initializeSocketIO } from './realtime/socket.js';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

type ClosableWorker = { close: () => Promise<void> };

async function startEmbeddedWorkers(): Promise<ClosableWorker[]> {
  if (!env.RUN_WORKER_IN_API) return [];
  const workerRoot = pathToFileURL(`${path.resolve(process.cwd(), 'apps/worker/dist/workers')}${path.sep}`).href;
  const [email, notification, cleanup, ai] = await Promise.all([
    import(`${workerRoot}email.worker.js`),
    import(`${workerRoot}notification.worker.js`),
    import(`${workerRoot}cleanup.worker.js`),
    import(`${workerRoot}ai.worker.js`)
  ]);
  logger.info('Starting embedded BullMQ workers for single-service deployment');
  return [email.startEmailWorker(), notification.startNotificationWorker(), cleanup.startCleanupWorker(), ai.startAIWorker()];
}

async function bootstrap() {
  await connectDatabase();
  const workers = await startEmbeddedWorkers();

  const app = createApp();
  const server = createServer(app);

  // Initialize Socket.IO Real-Time Server
  initializeSocketIO(server);

  server.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`DevFlow API & WebSockets server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down API server gracefully...`);
    await Promise.all(workers.map((worker) => worker.close()));
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start API server');
  process.exit(1);
});
