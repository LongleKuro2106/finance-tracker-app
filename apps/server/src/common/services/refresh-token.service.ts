import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RefreshTokenService {
  private readonly REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly refreshTokenSecret: string;
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private lastCleanupTime = 0;
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour base interval
  private readonly MIN_CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes minimum
  private readonly MAX_CLEANUP_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours maximum

  constructor(private readonly prisma: PrismaService) {
    // Get refresh token secret from environment - required in all environments
    const secret = process.env.REFRESH_SECRET;
    if (!secret) {
      throw new Error(
        'REFRESH_SECRET environment variable is required. Please set it in your .env file.',
      );
    }
    this.refreshTokenSecret = secret;

    // Adaptive cleanup: start with base interval, adjust based on token count
    this.scheduleAdaptiveCleanup();
  }

  /**
   * Generate a cryptographically secure token ID using crypto.randomBytes
   * Uses 16 bytes (128 bits) for collision resistance
   */
  private generateTokenId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Generate a new refresh token and store it in the database
   * Uses persistent storage (PostgreSQL) for horizontal scaling and data persistence
   */
  async generateRefreshToken(
    userId: string,
    username: string,
    tokenVersion: number,
  ): Promise<string> {
    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY_MS);
    const tokenId = this.generateTokenId();

    const payload = {
      sub: userId,
      username,
      tokenVersion,
      type: 'refresh',
      tokenId,
    };

    const refreshToken = jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: '7d',
    });

    // Store token metadata in database for persistence and horizontal scaling
    await this.prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        tokenId,
        userId,
        username,
        tokenVersion,
        expiresAt,
      },
    });

    return refreshToken;
  }

  /**
   * Validate a refresh token
   * Uses database lookup for persistent token validation across instances
   */
  async validateRefreshToken(token: string): Promise<{
    userId: string;
    username: string;
    tokenVersion: number;
  } | null> {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret) as unknown;

      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('sub' in payload) ||
        !('username' in payload) ||
        !('tokenVersion' in payload) ||
        !('type' in payload) ||
        !('tokenId' in payload)
      ) {
        return null;
      }

      const typedPayload = payload as {
        sub: string;
        username: string;
        tokenVersion: number;
        type: string;
        tokenId: string;
      };

      // Verify it's a refresh token
      if (typedPayload.type !== 'refresh') {
        return null;
      }

      // Check if token exists in database
      const tokenData = await this.prisma.refreshToken.findUnique({
        where: { tokenId: typedPayload.tokenId },
      });

      if (!tokenData) {
        return null; // Token was revoked or doesn't exist
      }

      // Check expiration
      if (tokenData.expiresAt < new Date()) {
        await this.prisma.refreshToken.delete({
          where: { tokenId: typedPayload.tokenId },
        });
        return null;
      }

      // Verify user still exists and token version matches
      const user = await this.prisma.user.findUnique({
        where: { id: typedPayload.sub },
      });

      if (!user || (user.tokenVersion ?? 1) !== typedPayload.tokenVersion) {
        // Token version mismatch - user logged out or token rotated
        await this.prisma.refreshToken.delete({
          where: { tokenId: typedPayload.tokenId },
        });
        return null;
      }

      return {
        userId: typedPayload.sub,
        username: typedPayload.username,
        tokenVersion: typedPayload.tokenVersion,
      };
    } catch {
      return null;
    }
  }

  /**
   * Revoke a single refresh token
   * Uses database deletion for persistent revocation
   */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { tokenId },
    });
  }

  /**
   * Revoke all refresh tokens for a user
   * Uses indexed database query for efficient bulk revocation
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * Rotate refresh token (revoke old, issue new)
   */
  async rotateRefreshToken(
    oldTokenId: string,
    userId: string,
    username: string,
    newTokenVersion: number,
  ): Promise<string> {
    // Revoke old token
    await this.revokeRefreshToken(oldTokenId);

    // Generate new refresh token
    return this.generateRefreshToken(userId, username, newTokenVersion);
  }

  /**
   * Cleanup expired tokens with adaptive interval
   * Adjusts cleanup frequency based on number of expired tokens found
   */
  private async cleanup(): Promise<void> {
    const now = new Date();
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    this.lastCleanupTime = Date.now();

    // Adjust cleanup interval based on number of tokens deleted
    // More tokens deleted = more frequent cleanup needed
    const deletedCount = result.count;
    let nextInterval = this.CLEANUP_INTERVAL_MS;

    if (deletedCount > 100) {
      // High cleanup activity - clean more frequently
      nextInterval = this.MIN_CLEANUP_INTERVAL_MS;
    } else if (deletedCount > 50) {
      // Medium cleanup activity
      nextInterval = this.CLEANUP_INTERVAL_MS / 2;
    } else if (deletedCount === 0) {
      // No expired tokens - can clean less frequently
      nextInterval = this.MAX_CLEANUP_INTERVAL_MS;
    }

    // Reschedule with adaptive interval
    this.scheduleAdaptiveCleanup(nextInterval);
  }

  /**
   * Schedule adaptive cleanup
   * Dynamically adjusts cleanup interval based on token store activity
   */
  private scheduleAdaptiveCleanup(intervalMs?: number): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }

    const interval = intervalMs ?? this.CLEANUP_INTERVAL_MS;
    this.cleanupIntervalId = setInterval(() => {
      void this.cleanup();
    }, interval);
  }

  /**
   * Cleanup on service destruction
   */
  onModuleDestroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
  }
}
