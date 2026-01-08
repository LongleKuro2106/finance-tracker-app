import { Injectable, ExecutionContext, Logger, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * User-based throttler guard: uses userId from JWT for rate limiting instead of IP address.
 * This ensures each authenticated user has their own rate limit bucket.
 * Falls back to IP-based limiting for unauthenticated requests.
 * Uses explicit ENABLE_RATE_LIMITING flag for better security control.
 */
@Injectable()
export class DevThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(DevThrottlerGuard.name);
  private readonly isRateLimitingEnabled: boolean;

  constructor(
    @Inject('THROTTLER_OPTIONS')
    protected readonly options: ThrottlerModuleOptions,
    @Inject('ThrottlerStorage')
    protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
  ) {
    super(options, storageService, reflector);
    // SECURITY: Rate limiting defaults to enabled in production, disabled in development
    // In production: enabled by default unless explicitly disabled (ENABLE_RATE_LIMITING=false)
    // In development: disabled by default unless explicitly enabled (ENABLE_RATE_LIMITING=true)
    // This prevents accidental disabling of rate limiting in production environments
    const enableRateLimiting = process.env.ENABLE_RATE_LIMITING;
    const isProduction = process.env.NODE_ENV === 'production';

    this.isRateLimitingEnabled = isProduction
      ? enableRateLimiting !== 'false' // Default to enabled in production
      : enableRateLimiting === 'true'; // Must explicitly enable in development

    if (!this.isRateLimitingEnabled) {
      this.logger.warn(
        'Rate limiting is DISABLED. Set ENABLE_RATE_LIMITING=true to enable.',
      );
    }
  }

  /**
   * Generate a unique key for rate limiting based on user ID or IP address.
   * Authenticated users are tracked by userId, unauthenticated requests by IP.
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Check if request has authenticated user (from JWT guard)
    const user = (req as Request & { user?: { userId: string } }).user;

    if (user?.userId) {
      // Use userId for authenticated requests: each user gets their own rate limit bucket
      return `user:${user.userId}`;
    }

    // Fallback to IP-based tracking for unauthenticated requests (e.g., login, signup)
    return super.getTracker(req);
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Skip throttling if explicitly disabled via environment variable
    if (!this.isRateLimitingEnabled) {
      return true;
    }

    // All endpoints should be rate limited when enabled
    return super.shouldSkip(context);
  }
}
