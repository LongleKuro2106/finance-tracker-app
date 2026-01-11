import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Decorator to extract request ID from request object
 *
 * Usage:
 * @Get()
 * someMethod(@RequestId() requestId: string) {
 *   // requestId is the unique request ID
 * }
 */
export const RequestId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request & { id?: string }>();
    return request.id;
  },
);
