import { prisma } from '../config/database.js';
import { Session, Prisma } from '@prisma/client';

export class SessionRepository {
  async create(data: Prisma.SessionUncheckedCreateInput): Promise<Session> {
    return prisma.session.create({ data });
  }

  async findById(id: string): Promise<Session | null> {
    return prisma.session.findUnique({
      where: { id }
    });
  }

  async findActiveByHash(refreshTokenHash: string): Promise<Session | null> {
    return prisma.session.findFirst({
      where: {
        refreshTokenHash,
        isRevoked: false,
        expiresAt: {
          gt: new Date()
        }
      }
    });
  }

  async revokeSession(id: string): Promise<Session> {
    return prisma.session.update({
      where: { id },
      data: { isRevoked: true }
    });
  }

  async revokeAllUserSessions(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.session.updateMany({
      where: {
        userId,
        isRevoked: false
      },
      data: { isRevoked: true }
    });
  }

  async replaceSession(
    oldSessionId: string,
    newSessionData: Prisma.SessionUncheckedCreateInput
  ): Promise<Session> {
    return prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: oldSessionId },
        data: { isRevoked: true }
      });
      return tx.session.create({
        data: newSessionData
      });
    });
  }

  async getUserActiveSessions(userId: string): Promise<Session[]> {
    return prisma.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

export const sessionRepository = new SessionRepository();
