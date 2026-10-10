import { notificationRepository } from '../repositories/notification.repository.js';
import { emitRealtimeEvent } from '../realtime/socket.js';
import { SocketEvent } from '@devflow/shared';

export class NotificationService {
  async createNotification(data: {
    userId: string;
    organizationId: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    metadata?: Record<string, unknown>;
  }) {
    // 1. Persist notification to MySQL Database (Source of Truth)
    const notification = await notificationRepository.create(data);

    // 2. Emit real-time event to user's private WebSocket channel
    emitRealtimeEvent(`user:${data.userId}`, SocketEvent.NOTIFICATION_CREATED, {
      notificationId: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      link: notification.link,
      createdAt: notification.createdAt
    });

    return notification;
  }

  async getUserNotifications(userId: string, page: number = 1, limit: number = 20, unreadOnly: boolean = false) {
    return notificationRepository.findUserNotifications(userId, page, limit, unreadOnly);
  }

  async getUnreadCount(userId: string) {
    const count = await notificationRepository.getUnreadCount(userId);
    return { unreadCount: count };
  }

  async markAsRead(notificationId: string, userId: string) {
    return notificationRepository.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: string) {
    await notificationRepository.markAllAsRead(userId);
    return { message: 'All notifications marked as read' };
  }
}

export const notificationService = new NotificationService();
