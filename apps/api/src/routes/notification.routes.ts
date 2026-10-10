import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuthenticatedUser } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuthenticatedUser);

router.get('/', asyncHandler(notificationController.listMyNotifications));
router.get('/unread-count', asyncHandler(notificationController.getUnreadCount));
router.patch('/:notificationId/read', asyncHandler(notificationController.markAsRead));
router.post('/mark-all-read', asyncHandler(notificationController.markAllAsRead));

export const notificationRouter = router;
