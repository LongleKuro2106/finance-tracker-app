import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';
import cors from 'cors';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request } from 'express';
import { getEnvConfig } from './common/config/env-validation.config';
import { AppLoggerService } from './common/services/logger.service';

async function bootstrap() {
  // Validate all environment variables at startup
  const envConfig = getEnvConfig();

  // Initialize logger service for secure logging
  const logger = new Logger('Bootstrap');
  const appLogger = new AppLoggerService();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: appLogger,
  });

  // Configure Express to trust the first proxy hop for accurate client IP extraction
  // Required for rate limiting, audit logging, and security enforcement
  app.set('trust proxy', 1);

  const { allowedOrigins, internalSecret } = envConfig;

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

        // Set CORS headers for internal requests
        // Use specific origin from request or default to 'self' for security
        const origin = req.headers.origin || req.headers.host;
        res.header('Access-Control-Allow-Origin', origin || "'self'");
        // Credentials header omitted: internal requests use proxy-based authentication

        // Mark request as processed to bypass subsequent CORS middleware
        (req as Request & { corsHandled?: boolean }).corsHandled = true;
      }

      next();
    },
  );

  // CORS middleware configuration for cross-origin browser requests
  // SECURITY: CSRF protection via Origin header validation
  // Only whitelisted origins are allowed, preventing CSRF attacks from other domains
  const corsMiddleware = cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        // Requests without Origin header are server-to-server
        // All environments require Origin header for browser requests
        // Internal requests are handled by prior middleware
        callback(new Error('CORS Error: Origin required'));
        return;
      }

      // SECURITY: Normalize origin string for exact matching (remove trailing slashes)
      // CORS origin matching requires exact string equality per RFC 6454
      const normalizedOrigin = origin.replace(/\/+$/, '');

      // SECURITY: Validate origin against whitelist
      // Only whitelisted origins are permitted for cross-origin requests
      // This prevents CSRF attacks from unauthorized origins
      if (allowedOrigins.indexOf(normalizedOrigin) !== -1) {
        callback(null, true);
      } else {
        // SECURITY: Return generic error to prevent information disclosure
        // Don't reveal which origins are whitelisted
        callback(new Error('CORS Error'));
      }
    },
    credentials: true, // SECURITY: Enable credentials (cookies) for whitelisted origins only
    // SECURITY: SameSite cookie attribute (set in cookie config) provides additional CSRF protection
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
      // SECURITY: CSRF protection is handled via Origin header validation above
      // Additional CSRF token header can be added here if needed
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
  // These headers protect against common web vulnerabilities
  app.use(
    helmet({
      // Content Security Policy: Prevents XSS attacks by restricting resource loading
      // API server does not serve HTML/CSS/JS content, so policies are restrictive
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"], // Only allow resources from same origin
          // Restrict style sources to prevent CSS injection attacks
          // API server does not serve HTML/CSS content
          styleSrc: ["'self'"],
          // Restrict script sources: API server does not serve JavaScript
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'], // Allow images from same origin, data URIs, and HTTPS
        },
      },
      // Cross-Origin Embedder Policy: Disabled for API server (not needed)
      crossOriginEmbedderPolicy: false,
      // HTTP Strict Transport Security: Forces HTTPS connections
      // Prevents man-in-the-middle attacks and protocol downgrade attacks
      hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true, // Apply to all subdomains
        preload: true, // Allow inclusion in browser HSTS preload lists
      },
    }),
  );

  // Additional security headers not covered by Helmet defaults
  app.use((req: Request, res: express.Response, next: express.NextFunction) => {
    // X-Content-Type-Options: Prevents MIME type sniffing attacks
    // Forces browser to respect Content-Type header, preventing XSS via file uploads
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // X-Frame-Options: Prevents clickjacking attacks
    // DENY prevents page from being embedded in iframe on any site
    res.setHeader('X-Frame-Options', 'DENY');
    // Control referrer information leakage
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Server binding configuration: listen on all network interfaces
  await app.listen(envConfig.port, envConfig.host);

  // Graceful shutdown handler: process signal management
  // Handles SIGTERM (container orchestration) and SIGINT (interactive termination)
  const gracefulShutdown = async (signal: string) => {
    logger.log(`${signal} received. Starting graceful shutdown...`);
    try {
      await app.close();
      logger.log('Application closed successfully');
      process.exit(0);
    } catch (error) {
      // Use logger service to sanitize error messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      appLogger.error(`Error during graceful shutdown: ${errorMessage}`, undefined, 'Bootstrap');
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
    (reason: unknown) => {
      // Sanitize error messages to prevent information disclosure
      const reasonMessage = reason instanceof Error ? reason.message : 'Unknown rejection';
      appLogger.error(`Unhandled Rejection: ${reasonMessage}`, undefined, 'Bootstrap');
      void gracefulShutdown('unhandledRejection');
    },
  );

  // Uncaught exception handler: prevent application crash
  process.on('uncaughtException', (error: Error) => {
    // Use logger service to sanitize error messages
    appLogger.error(`Uncaught Exception: ${error.message}`, error.stack, 'Bootstrap');
    void gracefulShutdown('uncaughtException');
  });
}
void bootstrap();
