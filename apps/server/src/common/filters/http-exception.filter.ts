import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common'
import type { Request, Response } from 'express'

/**
 * Global HTTP exception filter
 * Catches all HTTP exceptions and formats error responses consistently
 * Provides user-friendly error messages without exposing internal details
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const status = exception.getStatus()

    // Extract error message from exception
    const exceptionResponse = exception.getResponse()
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as { message?: string | string[] }).message

    // Normalize message to string array
    const errorMessages = Array.isArray(message) ? message : [message]

    // Build error response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: errorMessages,
    }

    response.status(status).json(errorResponse)
  }
}

/**
 * Global 404 Not Found exception filter
 * Catches NotFoundException and provides consistent 404 responses
 */
@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const errorResponse = {
      statusCode: HttpStatus.NOT_FOUND,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: ['The requested endpoint does not exist.'],
    }

    response.status(HttpStatus.NOT_FOUND).json(errorResponse)
  }
}
