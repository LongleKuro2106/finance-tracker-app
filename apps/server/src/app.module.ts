import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BudgetsModule } from './budgets/budgets.module';
import { AccountLockoutService } from './common/services/account-lockout.service';
import { AuditLoggerService } from './common/services/audit-logger.service';
import { DevThrottlerGuard } from './common/guards/dev-throttler.guard';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

// Rate limiting configuration
// Rate limiting configuration
// In development, use 10x production limits instead of unlimited
// Allows testing rate limiting behavior while preventing abuse
// In production: strict limits enforced
const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    // Configure throttler globally
    // Rate limiting enforced in both dev and production
    // Dev mode uses 10x production limits to allow testing while preventing abuse
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 1 minute
        limit: isProduction ? 200 : 2000, // 200 requests/min in production, 2000 in dev (10x)
      },
      {
        name: 'short',
        ttl: 60_000, // 1 minute
        limit: isProduction ? 200 : 2000, // 200 requests/min in production, 2000 in dev (10x)
      },
      {
        name: 'long',
        ttl: 3_600_000, // 1 hour
        limit: isProduction ? 1000 : 10000, // 1000 requests/hour in production, 10000 in dev (10x)
      },
      {
        name: 'analytics',
        ttl: 60_000, // 1 minute
        limit: isProduction ? 50 : 500, // 50 requests/min in production, 500 in dev (10x)
      },
    ]),
    UsersModule,
    AuthModule,
    TransactionsModule,
    AnalyticsModule,
    BudgetsModule,
  ],
  controllers: [AppController],
  providers: [
    AccountLockoutService,
    AuditLoggerService,
    {
      provide: 'APP_GUARD',
      useClass: DevThrottlerGuard,
    },
  ],
  exports: [AccountLockoutService, AuditLoggerService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply request ID middleware to all routes
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
