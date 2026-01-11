import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global HTTP Exception Filter
 *
 * Prevents stack trace exposure in error responses
 * - Logs full error details server-side for debugging
 * - Returns sanitized error messages to clients
 * - Never exposes stack traces, file paths, or internal implementation details
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code and message
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract error message safely
    let message: string;
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const msg = exceptionResponse.message;
        message = Array.isArray(msg) ? msg.join(', ') : String(msg);
      } else {
        message = exception.message || 'An error occurred';
      }
    } else if (exception instanceof Error) {
      message = exception.message || 'An error occurred';
    } else {
      message = 'An error occurred';
    }

    // Log full error details server-side (including stack trace)
    // but never send stack traces to clients
    const errorDetails = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      // Include stack trace in logs for debugging, but NOT in response
      ...(exception instanceof Error && {
        stack: exception.stack,
      }),
    };

    // Log error details (including stack trace) for server-side debugging
    if (status >= 500) {
      this.logger.error('Internal server error', errorDetails);
    } else {
      this.logger.warn('Client error', errorDetails);
    }

    // Return sanitized error response without stack traces
    // Never expose internal implementation details to clients
    const errorResponse: {
      statusCode: number;
      timestamp: string;
      path: string;
      message: string;
    } = {
      statusCode: status,
      timestamp: errorDetails.timestamp,
      path: errorDetails.path,
      message: message,
      // Stack trace intentionally omitted for security
    };

    // In production, use generic message for 500 errors to prevent information disclosure
    if (status >= 500 && process.env.NODE_ENV === 'production') {
      errorResponse.message = 'Internal server error';
    }

    response.status(status).json(errorResponse);
  }
}
