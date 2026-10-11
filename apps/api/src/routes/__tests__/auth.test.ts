import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { userRepository } from '../../repositories/user.repository.js';
import { sessionRepository } from '../../repositories/session.repository.js';
import { hashPassword, hashOpaqueToken } from '../../utils/crypto.js';
import { redis } from '../../config/redis.js';

describe('Authentication System API Integration Tests', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('registers a new user successfully and omits password hashes', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        email: 'newuser@example.com',
        name: 'New User',
        avatarUrl: null,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      };

      vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      vi.spyOn(userRepository, 'create').mockResolvedValue(mockUser as never);

      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'newuser@example.com',
        password: 'Password123!',
        name: 'New User'
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('newuser@example.com');
      expect(res.body.data.passwordHash).toBeUndefined();
      expect(res.body.data.verificationToken).toBeUndefined();
    });

    it('returns 409 conflict when registering with an existing email', async () => {
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValue({ id: 'existing' } as never);

      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'existing@example.com',
        password: 'Password123!',
        name: 'Existing User'
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('returns 422 validation error for weak passwords', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: '123',
        name: 'Test'
      });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    it('verifies a matching unexpired OTP without exposing the stored hash', async () => {
      vi.spyOn(userRepository, 'findByEmailIncludingUnverified').mockResolvedValue({
        id: 'user-uuid-1', email: 'newuser@example.com', name: 'New User', passwordHash: 'hash', avatarUrl: null,
        emailVerified: false, verificationToken: hashOpaqueToken('123456'), verificationTokenExpires: new Date(Date.now() + 60000),
        resetPasswordToken: null, resetPasswordExpires: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null
      } as never);
      const update = vi.spyOn(userRepository, 'update').mockResolvedValue({} as never);
      vi.spyOn(redis, 'del').mockResolvedValue(1);

      const res = await request(app).post('/api/v1/auth/verify-email').send({ email: 'newuser@example.com', code: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(update).toHaveBeenCalledWith('user-uuid-1', expect.objectContaining({ emailVerified: true, verificationToken: null, verificationTokenExpires: null }));
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('authenticates user, sets HTTP-only refresh cookie, and returns access token', async () => {
      const hashedPassword = await hashPassword('Password123!');
      const mockUser = {
        id: 'user-uuid-1',
        email: 'user@example.com',
        name: 'Test User',
        passwordHash: hashedPassword,
        avatarUrl: null,
        emailVerified: true,
        verificationToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      };

      vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser as never);
      vi.spyOn(sessionRepository, 'create').mockResolvedValue({ id: 'sess-1' } as never);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'user@example.com',
        password: 'Password123!'
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('user@example.com');
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Check HTTP-only cookie set
      const cookies = res.get('Set-Cookie') || [];
      expect(cookies.some((c: string) => c.includes('refresh_token') && c.includes('HttpOnly'))).toBe(true);
    });

    it('returns 401 for invalid credentials without revealing specific error', async () => {
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'Password123!'
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('requires email verification before creating a session', async () => {
      const hashedPassword = await hashPassword('Password123!');
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValue({
        id: 'unverified-user', email: 'unverified@example.com', name: 'Unverified User', passwordHash: hashedPassword,
        emailVerified: false, verificationToken: 'hashed-code', verificationTokenExpires: new Date(Date.now() + 60000),
        resetPasswordToken: null, resetPasswordExpires: null, avatarUrl: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null
      } as never);

      const res = await request(app).post('/api/v1/auth/login').send({ email: 'unverified@example.com', password: 'Password123!' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toBe('Verify your email address before signing in');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 unauthorized when request lacks Bearer token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
