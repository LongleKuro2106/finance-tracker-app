import { Injectable, ExecutionContext } from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerException,
  ThrottlerLimitDetail,
} from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Analytics-specific throttler guard
 *
 * Implements stricter rate limiting for analytics endpoints to prevent:
 * - Expensive query abuse
 * - Resource exhaustion attacks
 * - Individual users from overwhelming the system
 *
 * Limits:
 * - Production: 50 requests per minute per user (stricter than default 200/min)
 * - Development: 500 requests per minute per user (10x production limit for testing)
 *
 * Rate limiting is enforced in all environments to prevent DoS attacks
 */
@Injectable()
export class AnalyticsThrottlerGuard extends ThrottlerGuard {
  /**
   * Generate a unique key for rate limiting based on user ID or IP address.
   * Authenticated users are tracked by userId, unauthenticated requests by IP.
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Check if request has authenticated user (from JWT guard)
    const user = (req as Request & { user?: { userId: string } }).user;

    if (user?.userId) {
      // Use userId for authenticated requests with analytics-specific prefix
      return `analytics:user:${user.userId}`;
    }

    // Fallback to IP-based tracking for unauthenticated requests
    const ip = (req as Request).ip || (req as Request).socket.remoteAddress || 'unknown';
    return `analytics:ip:${ip}`;
  }

  /**
   * Rate limiting is enforced in all environments
   * Development uses 10x production limits (configured in controller) instead of disabling
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Never skip throttling - use reduced limits in development instead
    // The throttler module config handles dev limits via Number.MAX_SAFE_INTEGER in dev
    // But we should still apply throttling with higher limits
    return false; // Always apply throttling
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
    throw new ThrottlerException(
      'Too many analytics requests. Please wait a moment before trying again.',
    );
  }
}
