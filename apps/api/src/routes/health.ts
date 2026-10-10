import { Router } from 'express';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/live',
  asyncHandler(async (req, res) => {
    sendSuccess(res, { status: 'alive', timestamp: new Date().toISOString() });
  })
);

router.get(
  '/ready',
  asyncHandler(async (req, res) => {
    let dbStatus = 'ok';
    let redisStatus = 'ok';

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    try {
      await redis.ping();
    } catch {
      redisStatus = 'error';
    }

    const isReady = dbStatus === 'ok' && redisStatus === 'ok';

    res.status(isReady ? 200 : 503).json({
      success: isReady,
      data: {
        status: isReady ? 'ready' : 'degraded',
        dependencies: {
          database: dbStatus,
          redis: redisStatus
        },
        timestamp: new Date().toISOString()
      }
    });
  })
);

export const healthRouter = router;
