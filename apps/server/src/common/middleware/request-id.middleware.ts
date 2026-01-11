import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Request ID Middleware
 *
 * Generates a unique request ID for each incoming request and attaches it to:
 * - Request object (for use in controllers/services)
 * - Response header (X-Request-ID)
 * - Audit logs (via request object)
 *
 * This enables:
 * - Request tracing across services
 * - Correlation of related events in logs
 * - Better debugging and incident response
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Generate unique request ID
    const requestId = randomUUID();

    // Attach to request object for use throughout the request lifecycle
    (req as Request & { id?: string }).id = requestId;

    // Add to response header for client tracking
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
