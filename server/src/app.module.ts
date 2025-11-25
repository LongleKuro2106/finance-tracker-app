import { Module } from '@nestjs/common';
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

// Rate limiting configuration
// In development: unlimited (throttling disabled)
// In production: strict limits for security
const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    // Configure throttler globally, but it will be disabled in dev by DevThrottlerGuard
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 1 minute
        limit: isProduction ? 100 : Number.MAX_SAFE_INTEGER, // Unlimited in dev
      },
      {
        name: 'short',
        ttl: 60_000, // 1 minute
        limit: isProduction ? 5 : Number.MAX_SAFE_INTEGER, // Unlimited in dev
      },
      {
        name: 'long',
        ttl: 3_600_000, // 1 hour
        limit: isProduction ? 20 : Number.MAX_SAFE_INTEGER, // Unlimited in dev
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
export class AppModule {}
