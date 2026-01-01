import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';
import cors from 'cors';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configure Express to trust the first proxy hop for accurate client IP extraction
  // Required for rate limiting, audit logging, and security enforcement
  app.set('trust proxy', 1);

  // CORS origin whitelist configuration
  // Parses ALLOWED_ORIGINS environment variable or defaults to localhost in development
  const allowedOrigins = (() => {
    const origins = process.env.ALLOWED_ORIGINS;
    if (!origins) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'ALLOWED_ORIGINS environment variable is required in production',
        );
      }
      return ['http://localhost:3000']; // Development default: localhost only
    }
    // Normalize origin strings: trim whitespace and remove trailing slashes
    // CORS origin matching requires exact string equality per RFC 6454
    return origins
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''));
  })();

  // Shared secret for authenticating server-to-server requests
  // Prevents external clients from spoofing internal request headers
  const internalSecret = process.env.INTERNAL_SECRET;
  if (!internalSecret && process.env.NODE_ENV === 'production') {
    throw new Error(
      'INTERNAL_SECRET environment variable is required in production',
    );
  }

  // Access underlying Express instance for direct middleware control
  const expressApp = app.getHttpAdapter().getInstance();

  // Preflight validation middleware: reject non-preflight OPTIONS requests
  // CORS preflight requests are identified by the Access-Control-Request-Method header
  // This reduces attack surface by blocking non-standard OPTIONS usage
  expressApp.use(
    (req: Request, res: express.Response, next: express.NextFunction) => {
      if (req.method === 'OPTIONS') {
        // Validate preflight request per CORS specification (RFC 6454)
        // Legitimate preflight requests include Access-Control-Request-Method header
        const isPreflight =
          req.headers['access-control-request-method'] !== undefined;

        if (!isPreflight) {
          // Reject non-preflight OPTIONS requests with HTTP 405 Method Not Allowed
          return res.status(405).json({
            message: 'Method Not Allowed',
          });
        }
      }
      next();
    },
  );

  // Internal request authentication middleware: executes before CORS middleware
  // Validates server-to-server requests using shared secret authentication
  expressApp.use(
    (req: Request, res: express.Response, next: express.NextFunction) => {
      // Authenticate internal requests via X-Internal-Secret header
      // Prevents header spoofing by external clients
      const providedSecret = req.headers['x-internal-secret'];
      const isInternalRequest =
        internalSecret && providedSecret === internalSecret;

      // Detect server-to-server requests (no Origin header)
      const hasNoOrigin = !req.headers.origin;

      // Process authenticated internal requests without Origin header
      if (isInternalRequest && hasNoOrigin) {
        // Reject OPTIONS method for internal requests
        // Server-to-server communication does not require CORS preflight
        if (req.method === 'OPTIONS') {
          return res.status(405).json({
            message: 'Method Not Allowed',
          });
        }

        // Set permissive CORS headers for internal requests
        // Wildcard origin acceptable for server-to-server (no credentials required)
        res.header('Access-Control-Allow-Origin', '*');
        // Credentials header omitted: internal requests use proxy-based authentication

        // Mark request as processed to bypass subsequent CORS middleware
        (req as Request & { corsHandled?: boolean }).corsHandled = true;
      }

      next();
    },
  );

  // CORS middleware configuration for cross-origin browser requests
  const corsMiddleware = cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        // Requests without Origin header are server-to-server
        // Development mode: permit for testing convenience
        if (process.env.NODE_ENV !== 'production') {
          callback(null, true);
          return;
        }
        // Production mode: reject (internal requests handled by prior middleware)
        callback(new Error('CORS Error: Origin required'));
        return;
      }

      // Normalize origin string for exact matching (remove trailing slashes)
      const normalizedOrigin = origin.replace(/\/+$/, '');

      // Validate origin against whitelist
      // Only whitelisted origins are permitted for cross-origin requests
      if (allowedOrigins.indexOf(normalizedOrigin) !== -1) {
        callback(null, true);
      } else {
        // Return generic error to prevent information disclosure
        callback(new Error('CORS Error'));
      }
    },
    credentials: true, // Enable credentials (cookies, authorization headers) for whitelisted origins
    // OPTIONS method included for CORS preflight handling
    // Non-preflight OPTIONS requests are rejected by prior middleware
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Internal-Secret', // Required for server-to-server authentication
    ],
    maxAge: 86400, // Preflight cache duration: 24 hours (seconds)
  });

  // Conditional CORS middleware application
  // Skip CORS processing for requests already handled by internal request middleware
  expressApp.use(
    (req: Request, res: express.Response, next: express.NextFunction) => {
      // Bypass CORS middleware if request was processed by internal request handler
      if ((req as Request & { corsHandled?: boolean }).corsHandled === true) {
        return next();
      }
      // Apply CORS middleware to browser-originated requests
      corsMiddleware(req, res, next);
    },
  );

  // Request body size limits: mitigate memory exhaustion attacks
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Global validation pipe: defense-in-depth DTO validation
  // Validates all incoming request payloads against DTO schemas
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove properties without validation decorators
      forbidNonWhitelisted: true, // Reject requests containing non-whitelisted properties
      transform: true, // Transform payloads to DTO class instances
      transformOptions: {
        enableImplicitConversion: true, // Enable automatic type coercion
      },
    }),
  );

  // Security headers middleware: HTTP security policy enforcement
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Restrict style sources to prevent CSS injection attacks
          // API server does not serve HTML/CSS content
          styleSrc: ["'self'"],
          // Restrict script sources: API server does not serve JavaScript
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000, // HTTP Strict Transport Security: 1 year (seconds)
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Server binding configuration: listen on all network interfaces
  const port = process.env.PORT ?? 8000;
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);

  // Graceful shutdown handler: process signal management
  // Handles SIGTERM (container orchestration) and SIGINT (interactive termination)
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    try {
      await app.close();
      console.log('Application closed successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });

  // Unhandled promise rejection handler: prevent silent failures
  process.on(
    'unhandledRejection',
    (reason: unknown, promise: Promise<unknown>) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      void gracefulShutdown('unhandledRejection');
    },
  );

  // Uncaught exception handler: prevent application crash
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    void gracefulShutdown('uncaughtException');
  });
}
void bootstrap();
