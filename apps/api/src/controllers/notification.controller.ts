import { Response } from 'express';
import { notificationService } from '../services/notification.service.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { UnauthorizedError } from '../utils/errors.js';

export class NotificationController {
  listMyNotifications = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await notificationService.getUserNotifications(req.user.userId, page, limit, unreadOnly);
    sendPaginated(res, result.notifications, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages
    });
  };

  getUnreadCount = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const result = await notificationService.getUnreadCount(req.user.userId);
    sendSuccess(res, result);
  };

  markAsRead = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const { notificationId } = req.params;
    const updated = await notificationService.markAsRead(notificationId, req.user.userId);
    sendSuccess(res, updated);
  };

  markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const result = await notificationService.markAllAsRead(req.user.userId);
    sendSuccess(res, result);
  };
}

export const notificationController = new NotificationController();
