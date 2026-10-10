import { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie, REFRESH_COOKIE_NAME } from '../utils/cookie.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { UnauthorizedError } from '../utils/errors.js';

export class AuthController {
  register = async (req: Request, res: Response) => {
    const user = await authService.register(req.body);
    sendSuccess(res, user, 201);
  };

  login = async (req: Request, res: Response) => {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const result = await authService.login(req.body, userAgent, ipAddress);

    setRefreshTokenCookie(res, result.refreshToken);

    sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken
    });
  };

  refresh = async (req: Request, res: Response) => {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token cookie missing');
    }

    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const result = await authService.refreshTokens(refreshToken, userAgent, ipAddress);

    setRefreshTokenCookie(res, result.refreshToken);

    sendSuccess(res, {
      accessToken: result.accessToken
    });
  };

  logout = async (req: Request, res: Response) => {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
    await authService.logout(refreshToken);
    clearRefreshTokenCookie(res);
    sendSuccess(res, { message: 'Logged out successfully' });
  };

  logoutAll = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    await authService.logoutAll(req.user.userId);
    clearRefreshTokenCookie(res);
    sendSuccess(res, { message: 'Logged out from all active sessions' });
  };

  me = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const user = await authService.getCurrentUser(req.user.userId);
    sendSuccess(res, user);
  };

  forgotPassword = async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    sendSuccess(res, { message: 'If an account exists, a password reset link has been dispatched.' });
  };

  resetPassword = async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);
    sendSuccess(res, { message: 'Password has been reset successfully. Please log in with your new password.' });
  };

  verifyEmail = async (req: Request, res: Response) => {
    const { token } = req.params;
    await authService.verifyEmail(token);
    sendSuccess(res, { message: 'Email verified successfully.' });
  };
}

export const authController = new AuthController();
