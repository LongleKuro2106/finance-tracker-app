import { Injectable, ExecutionContext } from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerException,
  ThrottlerLimitDetail,
} from '@nestjs/throttler';
import { Request } from 'express';

/**
 * User-based throttler guard: uses userId from JWT for rate limiting instead of IP address.
 * This ensures each authenticated user has their own rate limit bucket.
 * Falls back to IP-based limiting for unauthenticated requests.
 */
@Injectable()
export class UserBasedThrottlerGuard extends ThrottlerGuard {
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

  /**
   * Skip throttling in development mode for easier testing.
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return super.shouldSkip(context);
  }

  /**
   * Throw throttler exception with user-friendly error message.
   */
  protected throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    // Suppress unused parameter warnings - required by base class signature
    void context;
    void throttlerLimitDetail;
    throw new ThrottlerException('Too many requests. Please try again later.');
  }
}
