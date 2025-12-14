import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust proxy for accurate IP addresses (important for rate limiting and audit logs)
  app.set('trust proxy', true);

  // CORS configuration
  // Client runs on port 3000, server on port 3010
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
    return origins.split(',').map((origin) => origin.trim());
  })();

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests without origin in development (server-to-server from Next.js API routes)
      // In production, require origin for browser requests, but allow server-to-server requests
      if (!origin) {
        // In development, allow no-origin requests (Next.js API routes)
        if (process.env.NODE_ENV !== 'production') {
          callback(null, true);
          return;
        }
        // In production, reject no-origin requests from browsers
        // Note: Server-to-server requests from Next.js API routes should include
        // a custom header or be handled differently in production
        callback(new Error('Origin required'));
        return;
      }

      // Only allow requests from whitelisted origins
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        // Generic error message to avoid information leakage
        callback(new Error('CORS Error'));
      }
    },
    credentials: true, // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Only standard REST methods
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    // Do not expose Authorization header - tokens are in HttpOnly cookies only
    // exposedHeaders removed for security (prevents client-side JS access to tokens)
    maxAge: 86400, // 24 hours
  });

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
  const port = process.env.PORT ?? 3010;
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
