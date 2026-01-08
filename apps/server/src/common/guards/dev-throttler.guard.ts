import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
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

  constructor(...args: ConstructorParameters<typeof ThrottlerGuard>) {
    super(...args);
    // SECURITY: Use explicit environment variable instead of relying on NODE_ENV
    // This prevents accidental disabling of rate limiting in production
    const enableRateLimiting = process.env.ENABLE_RATE_LIMITING;
    this.isRateLimitingEnabled =
      enableRateLimiting === 'true' ||
      (enableRateLimiting === undefined &&
        process.env.NODE_ENV === 'production');

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
