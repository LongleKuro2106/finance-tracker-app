import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BudgetsModule } from './budgets/budgets.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    TransactionsModule,
    AnalyticsModule,
    BudgetsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
