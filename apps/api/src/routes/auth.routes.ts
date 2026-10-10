import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validation.js';
import { requireAuthenticatedUser } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '@devflow/validation';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), asyncHandler(authController.register));
router.post('/login', authRateLimiter, validateBody(loginSchema), asyncHandler(authController.login));
router.post('/refresh', authRateLimiter, asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));
router.post('/logout-all', requireAuthenticatedUser, asyncHandler(authController.logoutAll));
router.get('/me', requireAuthenticatedUser, asyncHandler(authController.me));
router.post('/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
router.post('/reset-password', authRateLimiter, validateBody(resetPasswordSchema), asyncHandler(authController.resetPassword));
router.post('/verify-email/:token', asyncHandler(authController.verifyEmail));

export const authRouter = router;
