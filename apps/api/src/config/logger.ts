import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: {
    env: env.NODE_ENV
  },
  // Request logging must never persist credentials. pino-http uses the custom
  // `request` property configured in app.ts, while some direct logs use `req`.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'request.headers.authorization',
      'request.headers.cookie',
      'headers.authorization',
      'headers.cookie'
    ],
    remove: true
  },
  timestamp: pino.stdTimeFunctions.isoTime
});
