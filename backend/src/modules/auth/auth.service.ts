import { eq, and, gte, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, refreshTokens, loginAttempts, activityLogs } from '../../db/schema.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, parseExpiry } from '../../utils/jwt.js';
import { env } from '../../config/env.js';
import { AppError, UnauthorizedError, NotFoundError } from '../../middleware/errorHandler.js';
import type { UpdateProfileInput } from './auth.schema.js';
import { nanoid } from 'nanoid';

export class AuthService {
  async login(username: string, password: string, ipAddress: string, userAgent: string) {
    // Check lockout
    const lockoutTime = new Date(Date.now() - env.LOGIN_LOCKOUT_MINUTES * 60 * 1000);
    const recentAttempts = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.username, username),
          eq(loginAttempts.success, false),
          gte(loginAttempts.createdAt, lockoutTime)
        )
      );

    if (recentAttempts[0].count >= env.LOGIN_MAX_ATTEMPTS) {
      throw new AppError(429, `Akun terkunci. Coba lagi dalam ${env.LOGIN_LOCKOUT_MINUTES} menit.`, 'ACCOUNT_LOCKED');
    }

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!user || !user.isActive) {
      await this.recordLoginAttempt(username, ipAddress, false, userAgent);
      throw new UnauthorizedError('Username atau password salah');
    }

    const validPassword = await verifyPassword(user.passwordHash, password);
    if (!validPassword) {
      await this.recordLoginAttempt(username, ipAddress, false, userAgent);
      throw new UnauthorizedError('Username atau password salah');
    }

    await this.recordLoginAttempt(username, ipAddress, true, userAgent);

    // Update last login
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, role: user.role });

    // Store refresh token
    const expiresAt = new Date(Date.now() + parseExpiry(env.REFRESH_TOKEN_EXPIRES_IN));
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      userAgent,
      ipAddress,
      expiresAt,
    });

    // Log activity
    await db.insert(activityLogs).values({
      userId: user.id,
      action: 'auth.login',
      resource: 'users',
      resourceId: user.id,
      ipAddress,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  async refresh(refreshTokenValue: string, ipAddress: string, userAgent: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshTokenValue);
    } catch {
      throw new UnauthorizedError('Refresh token tidak valid');
    }

    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refreshTokenValue))
      .limit(1);

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));
      }
      throw new UnauthorizedError('Refresh token sudah kadaluarsa');
    }

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User tidak ditemukan atau tidak aktif');
    }

    // Rotate refresh token
    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));

    const newAccessToken = signAccessToken({ userId: user.id, role: user.role });
    const newRefreshToken = signRefreshToken({ userId: user.id, role: user.role });

    const expiresAt = new Date(Date.now() + parseExpiry(env.REFRESH_TOKEN_EXPIRES_IN));
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: newRefreshToken,
      userAgent,
      ipAddress,
      expiresAt,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshTokenValue: string) {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshTokenValue));
  }

  async getMe(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError('User tidak ditemukan');
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(userId: string, data: UpdateProfileInput, ipAddress: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError('User tidak ditemukan');

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name) updateData.name = data.name;
    if (data.phone) updateData.phone = data.phone;
    if (data.bankName !== undefined) updateData.bankName = data.bankName;
    if (data.bankAccount !== undefined) updateData.bankAccount = data.bankAccount;
    if (data.bankHolder !== undefined) updateData.bankHolder = data.bankHolder;

    if (data.password) {
      if (!data.currentPassword) {
        throw new AppError(400, 'Password lama wajib diisi');
      }
      const valid = await verifyPassword(user.passwordHash, data.currentPassword);
      if (!valid) {
        throw new AppError(400, 'Password lama tidak sesuai');
      }
      updateData.passwordHash = await hashPassword(data.password);
    }

    const [updated] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();

    await db.insert(activityLogs).values({
      userId,
      action: 'auth.update_profile',
      resource: 'users',
      resourceId: userId,
      ipAddress,
    });

    const { passwordHash: _, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  private async recordLoginAttempt(username: string, ipAddress: string, success: boolean, userAgent: string) {
    await db.insert(loginAttempts).values({ username, ipAddress, success, userAgent });
  }
}

export const authService = new AuthService();
