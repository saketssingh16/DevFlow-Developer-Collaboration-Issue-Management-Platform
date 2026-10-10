import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase } from './config/database.js';
import { initializeSocketIO } from './realtime/socket.js';

async function bootstrap() {
  await connectDatabase();

  const app = createApp();
  const server = createServer(app);

  // Initialize Socket.IO Real-Time Server
  initializeSocketIO(server);

  server.listen(env.PORT, () => {
    logger.info(`DevFlow API & WebSockets server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down API server gracefully...`);
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
