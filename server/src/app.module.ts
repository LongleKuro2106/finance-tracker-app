import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BudgetsModule } from './budgets/budgets.module';
import { AccountLockoutService } from './common/services/account-lockout.service';
import { AuditLoggerService } from './common/services/audit-logger.service';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    TransactionsModule,
    AnalyticsModule,
    BudgetsModule,
  ],
  controllers: [AppController],
  providers: [AccountLockoutService, AuditLoggerService],
  exports: [AccountLockoutService, AuditLoggerService],
})
export class AppModule {}
