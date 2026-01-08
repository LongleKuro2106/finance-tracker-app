import { Injectable, Logger, LoggerService } from '@nestjs/common';

/**
 * Application logger service
 * Provides structured logging with appropriate log levels
 * Prevents sensitive information leakage in production
 */
@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger = new Logger('AppLogger');

  /**
   * Log informational messages
   * Safe for production use - no sensitive data
   */
  log(message: string, context?: string): void {
    if (process.env.NODE_ENV === 'production') {
      // In production, use structured logging without stack traces
      this.logger.log(message, context);
    } else {
      // In development, include context for debugging
      this.logger.log(message, context);
    }
  }

  /**
   * Log error messages
   * Sanitizes error objects to prevent information disclosure
   */
  error(message: string, trace?: string, context?: string): void {
    if (process.env.NODE_ENV === 'production') {
      // In production, sanitize error messages
      // Only log error message, not full stack traces or error objects
      const sanitizedMessage = this.sanitizeErrorMessage(message);
      this.logger.error(sanitizedMessage, trace, context);
    } else {
      // In development, include full error details
      this.logger.error(message, trace, context);
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: string): void {
    this.logger.warn(message, context);
  }

  /**
   * Log debug messages
   * Only in development mode
   */
  debug(message: string, context?: string): void {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(message, context);
    }
  }

  /**
   * Log verbose messages
   * Only in development mode
   */
  verbose(message: string, context?: string): void {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.verbose(message, context);
    }
  }

  /**
   * Sanitize error messages to prevent information disclosure
   * Removes file paths, stack traces, and other sensitive information
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove file paths (common patterns)
    let sanitized = message.replace(/\/[^\s]+\.(ts|js|tsx|jsx):\d+:\d+/g, '[file]');

    // Remove absolute paths
    sanitized = sanitized.replace(/[A-Z]:\\[^\s]+/g, '[path]');
    sanitized = sanitized.replace(/\/[^\s]+/g, '[path]');

    // Remove stack trace indicators
    sanitized = sanitized.replace(/at\s+[^\s]+/g, '[stack]');

    // Remove error object stringification
    sanitized = sanitized.replace(/Error:\s*/g, '');

    return sanitized || 'An error occurred';
  }
}
