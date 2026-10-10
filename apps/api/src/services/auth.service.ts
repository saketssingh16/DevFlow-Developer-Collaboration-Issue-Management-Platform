import { userRepository } from '../repositories/user.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { hashPassword, verifyPassword, hashRefreshToken, generateRandomToken } from '../utils/crypto.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { BadRequestError, UnauthorizedError, ConflictError, NotFoundError } from '../utils/errors.js';
import { RegisterInput, LoginInput, ResetPasswordInput } from '@devflow/validation';
import { enqueueEmailJob } from '../jobs/queues.js';
import { randomUUID } from 'node:crypto';

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictError('An account with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const verificationToken = generateRandomToken();

    // 1. Database Persistence (Source of Truth)
    const user = await userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash,
      verificationToken
    });

    // 2. Asynchronous Background Job Enqueue (Does NOT block HTTP response)
    enqueueEmailJob('welcome_email', {
      email: user.email,
      name: user.name,
      verificationToken
    });

    const { passwordHash: _, verificationToken: __, resetPasswordToken: ___, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  async login(input: LoginInput, userAgent?: string, ipAddress?: string) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await verifyPassword(user.passwordHash, input.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const rawRefreshToken = generateRefreshToken({ userId: user.id, sessionId });
    const refreshTokenHash = hashRefreshToken(rawRefreshToken);

    await sessionRepository.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      userAgent,
      ipAddress,
      expiresAt
    });

    const accessToken = generateAccessToken({ userId: user.id, email: user.email });

    const { passwordHash: _, verificationToken: __, resetPasswordToken: ___, ...sanitizedUser } = user;

    return {
      user: sanitizedUser,
      accessToken,
      refreshToken: rawRefreshToken
    };
  }

  async refreshTokens(rawRefreshToken: string, userAgent?: string, ipAddress?: string) {
    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const hashedToken = hashRefreshToken(rawRefreshToken);
    const existingSession = await sessionRepository.findActiveByHash(hashedToken);

    if (!existingSession || existingSession.id !== payload.sessionId) {
      await sessionRepository.revokeAllUserSessions(payload.userId);
      throw new UnauthorizedError('Session revoked due to security verification failure');
    }

    const user = await userRepository.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedError('User account no longer active');
    }

    const newSessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const newRawRefreshToken = generateRefreshToken({ userId: user.id, sessionId: newSessionId });
    const newRefreshTokenHash = hashRefreshToken(newRawRefreshToken);

    await sessionRepository.replaceSession(existingSession.id, {
      id: newSessionId,
      userId: user.id,
      refreshTokenHash: newRefreshTokenHash,
      userAgent: userAgent || existingSession.userAgent,
      ipAddress: ipAddress || existingSession.ipAddress,
      expiresAt
    });

    const newAccessToken = generateAccessToken({ userId: user.id, email: user.email });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken
    };
  }

  async logout(rawRefreshToken?: string) {
    if (!rawRefreshToken) return;

    try {
      const payload = verifyRefreshToken(rawRefreshToken);
      await sessionRepository.revokeSession(payload.sessionId);
    } catch {
      // Ignore token verification error on logout
    }
  }

  async logoutAll(userId: string) {
    await sessionRepository.revokeAllUserSessions(userId);
  }

  async getCurrentUser(userId: string) {
    const user = await userRepository.findUserWithOrganizations(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return;
    }

    const resetToken = generateRandomToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await userRepository.update(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires
    });

    // Enqueue async email job for password reset link
    enqueueEmailJob('password_reset', {
      email: user.email,
      resetToken
    });
  }

  async resetPassword(input: ResetPasswordInput) {
    const user = await userRepository.findByResetToken(input.token);
    if (!user) {
      throw new BadRequestError('Invalid or expired password reset token');
    }

    const newPasswordHash = await hashPassword(input.newPassword);

    await userRepository.update(user.id, {
      passwordHash: newPasswordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null
    });

    await sessionRepository.revokeAllUserSessions(user.id);
  }

  async verifyEmail(token: string) {
    const user = await userRepository.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestError('Invalid or expired email verification token');
    }

    await userRepository.update(user.id, {
      emailVerified: true,
      verificationToken: null
    });
  }
}

export const authService = new AuthService();
