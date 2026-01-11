import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RefreshTokenService {
  private readonly REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly refreshTokenSecret: string;

  constructor(private readonly prisma: PrismaService) {
    // Get refresh token secret from environment - required in all environments
    const secret = process.env.REFRESH_SECRET;
    if (!secret) {
      throw new Error(
        'REFRESH_SECRET environment variable is required. Please set it in your .env file.',
      );
    }
    this.refreshTokenSecret = secret;

    // Cleanup expired tokens every hour
    setInterval(() => {
      void this.cleanup();
    }, 60 * 60 * 1000);
  }

  async generateRefreshToken(
    userId: string,
    username: string,
    tokenVersion: number,
  ): Promise<string> {
    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY_MS);
    // Use cryptographically secure random number generator
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

    // Store token metadata in database instead of in-memory Map
    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId,
        username,
        tokenVersion,
        expiresAt,
      },
    });

    return refreshToken;
  }

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
        where: { id: typedPayload.tokenId },
      });

      if (!tokenData) {
        return null; // Token was revoked or doesn't exist
      }

      // Check if token is revoked
      if (tokenData.revoked) {
        return null;
      }

      // Check expiration
      if (tokenData.expiresAt < new Date()) {
        // Mark as revoked and delete expired token
        await this.prisma.refreshToken.delete({
          where: { id: typedPayload.tokenId },
        }).catch(() => {
          // Ignore errors if already deleted
        });
        return null;
      }

      // Verify user still exists and token version matches
      const user = await this.prisma.user.findUnique({
        where: { id: typedPayload.sub },
      });

      if (!user || (user.tokenVersion ?? 1) !== typedPayload.tokenVersion) {
        // Token version mismatch - user logged out or token rotated
        // Mark token as revoked
        await this.prisma.refreshToken.update({
          where: { id: typedPayload.tokenId },
          data: { revoked: true, revokedAt: new Date() },
        }).catch(() => {
          // Ignore errors if already deleted
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

  async revokeRefreshToken(tokenId: string): Promise<void> {
    // Revoke token in database
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revoked: true, revokedAt: new Date() },
    }).catch(() => {
      // Ignore errors if token doesn't exist (already deleted/revoked)
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    // Revoke all user tokens in database
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false,
      },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });
  }

  async rotateRefreshToken(
    oldTokenId: string,
    userId: string,
    username: string,
    newTokenVersion: number,
  ): Promise<string> {
    // Revoke old token in database before generating new one
    await this.revokeRefreshToken(oldTokenId);

    // Generate new refresh token
    return this.generateRefreshToken(userId, username, newTokenVersion);
  }

  /**
   * Generate cryptographically secure token ID
   * Uses crypto.randomBytes() instead of Math.random() to prevent predictable token IDs
   */
  private generateTokenId(): string {
    // Generate 32 bytes (256 bits) of random data and convert to hex string
    // This provides sufficient entropy for secure token IDs
    return randomBytes(32).toString('hex');
  }

  /**
   * Cleanup expired tokens from database
   * Removes expired tokens to prevent database bloat
   */
  private async cleanup(): Promise<void> {
    const now = new Date();
    // Delete expired tokens that are not already revoked
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
        revoked: false,
      },
    });
  }
}
