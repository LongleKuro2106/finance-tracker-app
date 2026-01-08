import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AccountLockoutService {
  // Uses database storage for horizontal scaling and persistent lockout state
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {
    // Cleanup old entries every 5 minutes
    this.cleanupIntervalId = setInterval(() => {
      void this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Record a failed login attempt
   * Uses database storage for persistent lockout tracking across instances
   */
  async recordFailedAttempt(
    usernameOrEmail: string,
    userId?: string,
  ): Promise<{
    isLocked: boolean;
    remainingAttempts: number;
    lockedUntil?: Date;
  }> {
    const identifier = userId || usernameOrEmail;
    const now = new Date();

    // Find or create lockout record
    let lockout = await this.prisma.accountLockout.findUnique({
      where: { identifier },
    });

    // Check if account is currently locked
    if (lockout?.lockedUntil && lockout.lockedUntil > now) {
      return {
        isLocked: true,
        remainingAttempts: 0,
        lockedUntil: lockout.lockedUntil,
      };
    }

    // Reset if lockout expired
    if (lockout?.lockedUntil && lockout.lockedUntil <= now) {
      await this.prisma.accountLockout.delete({
        where: { identifier },
      });
      lockout = null;
    }

    // Increment attempt count or create new record
    const newAttemptCount = lockout ? lockout.attemptCount + 1 : 1;
    const lockedUntil =
      newAttemptCount >= this.MAX_FAILED_ATTEMPTS
        ? new Date(now.getTime() + this.LOCKOUT_DURATION_MS)
        : null;

    if (lockout) {
      // Update existing record
      lockout = await this.prisma.accountLockout.update({
        where: { identifier },
        data: {
          attemptCount: newAttemptCount,
          lastAttempt: now,
          lockedUntil,
          userId: userId || lockout.userId,
        },
      });
    } else {
      // Create new record
      lockout = await this.prisma.accountLockout.create({
        data: {
          id: randomUUID(),
          identifier,
          userId: userId || null,
          attemptCount: newAttemptCount,
          lastAttempt: now,
          lockedUntil,
        },
      });
    }

    if (lockedUntil) {
      return {
        isLocked: true,
        remainingAttempts: 0,
        lockedUntil,
      };
    }

    return {
      isLocked: false,
      remainingAttempts: this.MAX_FAILED_ATTEMPTS - newAttemptCount,
    };
  }

  /**
   * Clear failed attempts for a user
   * Uses database deletion for persistent state management
   */
  async clearFailedAttempts(
    usernameOrEmail: string,
    userId?: string,
  ): Promise<void> {
    const identifier = userId || usernameOrEmail;
    await this.prisma.accountLockout.deleteMany({
      where: { identifier },
    });
  }

  /**
   * Check if account is locked
   * Uses database lookup for consistent lockout state across instances
   */
  async isLocked(usernameOrEmail: string, userId?: string): Promise<boolean> {
    const identifier = userId || usernameOrEmail;
    const lockout = await this.prisma.accountLockout.findUnique({
      where: { identifier },
    });

    if (!lockout?.lockedUntil) {
      return false;
    }

    const now = new Date();
    if (lockout.lockedUntil <= now) {
      // Lockout expired, clean up
      await this.prisma.accountLockout.delete({
        where: { identifier },
      });
      return false;
    }

    return true;
  }

  /**
   * Cleanup expired lockout records
   * Uses database queries for efficient bulk deletion of expired entries
   */
  private async cleanup(): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Delete expired lockouts and old records without recent attempts
    await this.prisma.accountLockout.deleteMany({
      where: {
        OR: [
          // Expired lockouts
          {
            lockedUntil: {
              not: null,
              lte: now,
            },
          },
          // Old records without lockouts and no recent attempts
          {
            lockedUntil: null,
            lastAttempt: {
              lt: oneHourAgo,
            },
          },
        ],
      },
    });
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
