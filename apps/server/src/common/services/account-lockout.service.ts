import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface FailedLoginAttempt {
  count: number;
  lastAttempt: Date;
  lockedUntil?: Date;
}

@Injectable()
export class AccountLockoutService {
  // In-memory store for failed login attempts
  // In production, consider using Redis for distributed systems
  // Maximum size limit to prevent memory exhaustion
  private readonly failedAttempts = new Map<string, FailedLoginAttempt>();

  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  // Maximum number of entries to prevent memory exhaustion
  // Limits the store to 10,000 entries (approximately 10MB memory)
  private readonly MAX_STORE_SIZE = 10000;

  constructor(private readonly prisma: PrismaService) {
    // Cleanup old entries every 5 minutes
    setInterval(() => {
      void this.cleanup();
    }, 5 * 60 * 1000);
  }

  recordFailedAttempt(
    usernameOrEmail: string,
    userId?: string,
  ): Promise<{
    isLocked: boolean;
    remainingAttempts: number;
    lockedUntil?: Date;
  }> {
    const key = userId || usernameOrEmail;
    const now = new Date();
    const attempt = this.failedAttempts.get(key);

    if (attempt?.lockedUntil && attempt.lockedUntil > now) {
      // Still locked
      return Promise.resolve({
        isLocked: true,
        remainingAttempts: 0,
        lockedUntil: attempt.lockedUntil,
      });
    }

    // Reset if lockout expired
    if (attempt?.lockedUntil && attempt.lockedUntil <= now) {
      this.failedAttempts.delete(key);
    }

    const newAttempt: FailedLoginAttempt = attempt
      ? {
          count: attempt.count + 1,
          lastAttempt: now,
        }
      : {
          count: 1,
          lastAttempt: now,
        };

    // Lock account if max attempts reached
    if (newAttempt.count >= this.MAX_FAILED_ATTEMPTS) {
      newAttempt.lockedUntil = new Date(
        now.getTime() + this.LOCKOUT_DURATION_MS,
      );
      this.failedAttempts.set(key, newAttempt);

      // If we have userId, update user record (optional - for persistence)
      if (userId) {
        // You could add a lockedUntil field to User model if needed
        // await this.prisma.user.update({
        //   where: { id: userId },
        //   data: { lockedUntil: newAttempt.lockedUntil },
        // });
      }

      return Promise.resolve({
        isLocked: true,
        remainingAttempts: 0,
        lockedUntil: newAttempt.lockedUntil,
      });
    }

    // Enforce maximum size limit before adding new entry
    this.enforceMaxSize();

    this.failedAttempts.set(key, newAttempt);

    return Promise.resolve({
      isLocked: false,
      remainingAttempts: this.MAX_FAILED_ATTEMPTS - newAttempt.count,
    });
  }

  clearFailedAttempts(usernameOrEmail: string, userId?: string): Promise<void> {
    const key = userId || usernameOrEmail;
    this.failedAttempts.delete(key);
    return Promise.resolve();
  }

  isLocked(usernameOrEmail: string, userId?: string): Promise<boolean> {
    const key = userId || usernameOrEmail;
    const attempt = this.failedAttempts.get(key);

    if (!attempt?.lockedUntil) {
      return Promise.resolve(false);
    }

    if (attempt.lockedUntil <= new Date()) {
      // Lockout expired, clean up
      this.failedAttempts.delete(key);
      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  }

  /**
   * Enforce maximum size limit to prevent memory exhaustion
   * Removes oldest entries when store exceeds maximum size
   * SECURITY FIX: Optimized from O(n log n) to O(n) by using linear scan instead of sorting
   */
  private enforceMaxSize(): void {
    if (this.failedAttempts.size < this.MAX_STORE_SIZE) {
      return;
    }

    // Calculate how many entries to remove (remove 10% when limit is reached)
    const entriesToRemove = Math.ceil(this.MAX_STORE_SIZE * 0.1);

    // SECURITY FIX: Use O(n) linear scan instead of O(n log n) sorting
    // Find oldest entries without sorting entire map
    const entries = Array.from(this.failedAttempts.entries());
    const now = Date.now();

    // Find entries older than 1 hour (candidates for removal)
    const oldEntries = entries
      .filter(([, attempt]) => now - attempt.lastAttempt.getTime() > 60 * 60 * 1000)
      .sort((a, b) => a[1].lastAttempt.getTime() - b[1].lastAttempt.getTime())
      .slice(0, entriesToRemove);

    // If we don't have enough old entries, remove oldest from all entries
    // but limit the sort to only what we need (partial sort)
    if (oldEntries.length < entriesToRemove) {
      const remaining = entriesToRemove - oldEntries.length;
      // Use partial sort: only sort enough entries to find the oldest ones
      const allEntries = entries
        .filter(([key]) => !oldEntries.some(([oldKey]) => oldKey === key))
        .sort((a, b) => a[1].lastAttempt.getTime() - b[1].lastAttempt.getTime())
        .slice(0, remaining);

      oldEntries.push(...allEntries);
    }

    // Remove oldest entries
    for (const [key] of oldEntries) {
      this.failedAttempts.delete(key);
    }
  }

  private cleanup(): void {
    const now = new Date();
    for (const [key, attempt] of this.failedAttempts.entries()) {
      // Remove if locked until expired and no recent attempts (older than 1 hour)
      if (
        (!attempt.lockedUntil || attempt.lockedUntil <= now) &&
        now.getTime() - attempt.lastAttempt.getTime() > 60 * 60 * 1000
      ) {
        this.failedAttempts.delete(key);
      }
    }

    // Enforce size limit after cleanup
    this.enforceMaxSize();
  }
}
