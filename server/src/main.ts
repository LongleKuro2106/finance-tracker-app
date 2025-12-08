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
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Authorization'],
    maxAge: 86400, // 24 hours
  });

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
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
