import { prisma } from '../config/database.js';
import { Notification, Prisma } from '@prisma/client';

export class NotificationRepository {
  async create(data: {
    userId: string;
    organizationId: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Notification> {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        organizationId: data.organizationId,
        title: data.title,
        message: data.message,
        type: data.type,
        link: data.link,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined
      }
    });
  }

  async findUserNotifications(userId: string, page: number = 1, limit: number = 20, unreadOnly: boolean = false) {
    const skip = (page - 1) * limit;
    const where = {
      userId,
      ...(unreadOnly ? { read: false } : {})
    };

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false }
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id: notificationId, userId },
      data: { read: true }
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    });
  }
}

export const notificationRepository = new NotificationRepository();
