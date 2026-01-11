import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * User-based throttler guard: uses userId from JWT for rate limiting instead of IP address.
 * This ensures each authenticated user has their own rate limit bucket.
 * Falls back to IP-based limiting for unauthenticated requests.
 * Disables throttling in development mode for easier testing.
 */
@Injectable()
export class DevThrottlerGuard extends ThrottlerGuard {
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
    // Use reduced rate limits in development instead of disabling
    // Allows testing rate limiting behavior while preventing abuse
    // Rate limiting is still enforced but with higher limits (10x production)
    // In production, normal limits apply
    if (process.env.NODE_ENV !== 'production') {
      // Don't skip entirely - let throttler apply with higher dev limits
      // The throttler module config handles this via Number.MAX_SAFE_INTEGER in dev
      return false;
    }

    // Budget endpoints are rate-limited like other endpoints to prevent DoS attacks
    // Even user-specific data can be abused to exhaust server resources

    return super.shouldSkip(context);
  }
}
