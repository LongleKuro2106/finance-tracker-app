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

  // Trust proxy for accurate IP addresses (important for rate limiting and audit logs)
  // Trust only first proxy (more secure than trusting all proxies)
  app.set('trust proxy', 1);

  // CORS configuration
  // Client runs on port 3000, server on port 8000
  const allowedOrigins = (() => {
    const origins = process.env.ALLOWED_ORIGINS;
    if (!origins) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'ALLOWED_ORIGINS environment variable is required in production',
        );
      }
      return ['http://localhost:3000']; // Default: localhost only (dev only)
    }
    // Normalize origins: remove trailing slashes and trim whitespace
    // CORS origin matching is exact, so http://localhost:3000/ won't match http://localhost:3000
    return origins
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, '')); // Remove trailing slashes
  })();

  // Internal request secret for server-to-server authentication
  // This prevents spoofing of internal requests by external clients
  const internalSecret = process.env.INTERNAL_SECRET;
  if (!internalSecret && process.env.NODE_ENV === 'production') {
    throw new Error(
      'INTERNAL_SECRET environment variable is required in production',
    );
  }

  // Get underlying Express instance for direct CORS control
  const expressApp = app.getHttpAdapter().getInstance();

  // Custom middleware to handle internal requests BEFORE CORS runs
  // This ensures we can verify internal requests using the request object
  expressApp.use(
    (req: Request, res: express.Response, next: express.NextFunction) => {
      // Verify internal request using shared secret (prevents header spoofing)
      const providedSecret = req.headers['x-internal-secret'];
      const isInternalRequest =
        internalSecret && providedSecret === internalSecret;

      // Check if request has no origin (server-to-server from Next.js API routes)
      const hasNoOrigin = !req.headers.origin;

      // For internal requests without origin, handle CORS completely here
      if (isInternalRequest && hasNoOrigin) {
        // Handle preflight OPTIONS requests
        if (req.method === 'OPTIONS') {
          res.header('Access-Control-Allow-Origin', '*');
          res.header(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, DELETE, OPTIONS',
          );
          res.header(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Internal-Secret',
          );
          // Don't set credentials for internal requests (CORS spec)
          return res.sendStatus(204);
        }

        // For non-preflight internal requests, set CORS headers
        // Note: Internal requests are server-to-server, so we can use * without credentials
        res.header('Access-Control-Allow-Origin', '*');
        // Don't set credentials for internal requests (they use cookies via proxy)

        // Mark as handled so CORS middleware skips it
        (req as Request & { corsHandled?: boolean }).corsHandled = true;
      }

      next();
    },
  );

  // Create CORS middleware for browser requests
  const corsMiddleware = cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        // No origin header (server-to-server request)
        // In development, allow no-origin requests (for easier testing)
        if (process.env.NODE_ENV !== 'production') {
          callback(null, true);
          return;
        }
        // In production, reject no-origin requests (internal ones should be handled above)
        callback(new Error('CORS Error: Origin required'));
        return;
      }

      // Normalize origin (remove trailing slash) for exact matching
      const normalizedOrigin = origin.replace(/\/+$/, '');

      // Request has origin header (browser request)
      // Only allow requests from whitelisted origins (normalized)
      if (allowedOrigins.indexOf(normalizedOrigin) !== -1) {
        callback(null, true);
      } else {
        // Generic error message to avoid information leakage
        callback(new Error('CORS Error'));
      }
    },
    credentials: true, // Allow cookies/auth headers (only with valid origins)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Internal-Secret', // Allow custom header for server-to-server authentication
    ],
    maxAge: 86400, // 24 hours
  });

  // Apply CORS middleware, but skip for internal requests (already handled above)
  expressApp.use(
    (req: Request, res: express.Response, next: express.NextFunction) => {
      // If request was already handled by our middleware (internal request), skip CORS
      if ((req as Request & { corsHandled?: boolean }).corsHandled === true) {
        return next();
      }
      // Apply CORS middleware for browser requests
      corsMiddleware(req, res, next);
    },
  );

  // Request body size limits (prevent memory exhaustion attacks)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Global validation pipe (defense in depth - validates all DTOs)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Allow implicit type conversion
      },
    }),
  );

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Remove 'unsafe-inline' from styleSrc to prevent CSS injection
          // Backend API doesn't serve HTML/CSS, so inline styles are not needed
          styleSrc: ["'self'"],
          // Only allow scripts from same origin (backend doesn't serve scripts)
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Bind to 0.0.0.0 to allow network access (not just localhost)
  const port = process.env.PORT ?? 8000;
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);

  // Graceful shutdown handling
  // Handle SIGTERM (Docker stop) and SIGINT (Ctrl+C)
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

  // Handle unhandled promise rejections
  process.on(
    'unhandledRejection',
    (reason: unknown, promise: Promise<unknown>) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      void gracefulShutdown('unhandledRejection');
    },
  );

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    void gracefulShutdown('uncaughtException');
  });
}
void bootstrap();
