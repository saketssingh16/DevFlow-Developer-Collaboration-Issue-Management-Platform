import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { correlationIdMiddleware } from './middleware/correlation.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.routes.js';
import { organizationRouter } from './routes/organization.routes.js';
import { organizationProjectRouter, projectRouter } from './routes/project.routes.js';
import { notificationRouter } from './routes/notification.routes.js';
import { aiRouter } from './routes/ai.routes.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import path from 'node:path';

export const createApp = () => {
  const app = express();

  // Nginx is the only trusted proxy in the production Compose deployment.
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(correlationIdMiddleware);

  if (process.env.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        customAttributeKeys: {
          req: 'request',
          res: 'response',
          err: 'error',
          responseTime: 'timeMs'
        }
      })
    );
  }

  // Health check routes
  app.use('/health', healthRouter);

  // API v1 routes
  const apiV1Router = express.Router();
  apiV1Router.use(rateLimiter());
  apiV1Router.use('/auth', authRouter);
  apiV1Router.use('/organizations', organizationRouter);
  apiV1Router.use('/organizations/:organizationId/projects', organizationProjectRouter);
  apiV1Router.use('/projects', projectRouter);
  apiV1Router.use('/projects/:projectId/ai', aiRouter);
  apiV1Router.use('/notifications', notificationRouter);

  app.use('/api/v1', apiV1Router);

  // Render deploys one Node web service. Serve the compiled SPA after API routes
  // so browser navigation and the API share one origin.
  if (env.NODE_ENV === 'production') {
    const webDist = path.resolve(process.cwd(), 'apps/web/dist');
    app.use(express.static(webDist));
    app.get('*', (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
  }

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`
      }
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
