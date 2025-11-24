import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

interface RefreshTokenData {
  userId: string;
  username: string;
  tokenVersion: number;
  expiresAt: Date;
  createdAt: Date;
}

@Injectable()
export class RefreshTokenService {
  private readonly refreshTokenStore = new Map<string, RefreshTokenData>();
  private readonly REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {
    // Cleanup expired tokens every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  generateRefreshToken(
    userId: string,
    username: string,
    tokenVersion: number,
  ): Promise<string> {
    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY_MS);
    const tokenId = this.generateTokenId();

    const refreshToken = this.jwt.sign(
      {
        sub: userId,
        username,
        tokenVersion,
        type: 'refresh',
        tokenId,
      },
      {
        expiresIn: '7d',
      },
    );

    // Store token metadata
    this.refreshTokenStore.set(tokenId, {
      userId,
      username,
      tokenVersion,
      expiresAt,
      createdAt: new Date(),
    });

    return Promise.resolve(refreshToken);
  }

  async validateRefreshToken(token: string): Promise<{
    userId: string;
    username: string;
    tokenVersion: number;
  } | null> {
    try {
      const payload = this.jwt.verify(token) as unknown;

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

      // Check if token exists in store
      const tokenData = this.refreshTokenStore.get(typedPayload.tokenId);
      if (!tokenData) {
        return null; // Token was revoked or doesn't exist
      }

      // Check expiration
      if (tokenData.expiresAt < new Date()) {
        this.refreshTokenStore.delete(typedPayload.tokenId);
        return null;
      }

      // Verify user still exists and token version matches
      const user = await this.prisma.user.findUnique({
        where: { id: typedPayload.sub },
      });

      if (!user || (user.tokenVersion ?? 1) !== typedPayload.tokenVersion) {
        // Token version mismatch - user logged out or token rotated
        this.refreshTokenStore.delete(typedPayload.tokenId);
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

  revokeRefreshToken(tokenId: string): Promise<void> {
    this.refreshTokenStore.delete(tokenId);
    return Promise.resolve();
  }

  revokeAllUserTokens(userId: string): Promise<void> {
    for (const [tokenId, tokenData] of this.refreshTokenStore.entries()) {
      if (tokenData.userId === userId) {
        this.refreshTokenStore.delete(tokenId);
      }
    }
    return Promise.resolve();
  }

  async rotateRefreshToken(
    oldTokenId: string,
    userId: string,
    username: string,
    newTokenVersion: number,
  ): Promise<string> {
    // Revoke old token
    void this.revokeRefreshToken(oldTokenId);

    // Generate new refresh token
    return this.generateRefreshToken(userId, username, newTokenVersion);
  }

  private generateTokenId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private cleanup(): void {
    const now = new Date();
    for (const [tokenId, tokenData] of this.refreshTokenStore.entries()) {
      if (tokenData.expiresAt < now) {
        this.refreshTokenStore.delete(tokenId);
      }
    }
  }
}
