import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom throttler guard that disables rate limiting in development mode.
 * This allows for easier testing without hitting rate limits.
 */
@Injectable()
export class DevThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Skip throttling in development mode
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return super.shouldSkip(context);
  }
}
