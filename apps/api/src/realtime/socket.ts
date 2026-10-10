import { Server as HTTPServer } from 'node:http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken, AccessTokenPayload } from '../utils/token.js';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { SocketEvent } from '@devflow/shared';
import { env } from '../config/env.js';

interface AuthenticatedSocket extends Socket {
  data: {
    user?: AccessTokenPayload;
  };
}

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unexpected WebSocket error';

let io: SocketIOServer | null = null;

export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true
    },
    pingTimeout: 30000,
    pingInterval: 10000
  });

  // Socket Authentication Middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required for WebSocket connection'));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid or expired WebSocket authentication token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;
    logger.info({ userId: user?.userId, socketId: socket.id }, 'WebSocket client connected');

    // Automatically join user's private room for direct notifications
    if (user?.userId) {
      socket.join(`user:${user.userId}`);
    }

    // Room Authorization: Organization Room
    socket.on('join:organization', async (organizationId: string, callback?: (res: { success: boolean; error?: string }) => void) => {
      try {
        if (!user?.userId) throw new Error('Unauthenticated');
        const member = await prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: { organizationId, userId: user.userId }
          }
        });

        if (!member) {
          if (callback) callback({ success: false, error: 'Unauthorized organization room access' });
          return;
        }

        socket.join(`org:${organizationId}`);
        if (callback) callback({ success: true });
      } catch (err) {
        if (callback) callback({ success: false, error: errorMessage(err) });
      }
    });

    // Room Authorization: Project Room
    socket.on('join:project', async (projectId: string, callback?: (res: { success: boolean; error?: string }) => void) => {
      try {
        if (!user?.userId) throw new Error('Unauthenticated');
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
          if (callback) callback({ success: false, error: 'Project not found' });
          return;
        }

        const orgMember = await prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: { organizationId: project.organizationId, userId: user.userId }
          }
        });

        if (!orgMember) {
          if (callback) callback({ success: false, error: 'Unauthorized project room access' });
          return;
        }

        socket.join(`project:${projectId}`);
        if (callback) callback({ success: true });
      } catch (err) {
        if (callback) callback({ success: false, error: errorMessage(err) });
      }
    });

    // Room Authorization: Issue Room
    socket.on('join:issue', async (issueId: string, callback?: (res: { success: boolean; error?: string }) => void) => {
      try {
        if (!user?.userId) throw new Error('Unauthenticated');
        const issue = await prisma.issue.findUnique({
          where: { id: issueId },
          include: { project: true }
        });

        if (!issue) {
          if (callback) callback({ success: false, error: 'Issue not found' });
          return;
        }

        const orgMember = await prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: { organizationId: issue.project.organizationId, userId: user.userId }
          }
        });

        if (!orgMember) {
          if (callback) callback({ success: false, error: 'Unauthorized issue room access' });
          return;
        }

        socket.join(`issue:${issueId}`);
        if (callback) callback({ success: true });
      } catch (err) {
        if (callback) callback({ success: false, error: errorMessage(err) });
      }
    });

    socket.on('disconnect', () => {
      logger.info({ userId: user?.userId, socketId: socket.id }, 'WebSocket client disconnected');
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }
  return io;
}

export function emitRealtimeEvent(room: string, eventName: SocketEvent | string, payload: unknown) {
  if (io) {
    io.to(room).emit(eventName, payload);
  }
}
