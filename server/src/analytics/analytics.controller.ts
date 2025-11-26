import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DevThrottlerGuard } from '../common/guards/dev-throttler.guard';
import {
  AnalyticsService,
  OverviewResponse,
  MonthlyData,
  CategoryData,
  DailyData,
} from './analytics.service';

// Use DevThrottlerGuard which disables throttling in development
@UseGuards(JwtAuthGuard, DevThrottlerGuard)
@Throttle({
  default: {
    limit: process.env.NODE_ENV === 'production' ? 40 : Number.MAX_SAFE_INTEGER,
    ttl: 60_000, // 1 minute
  },
  long: {
    limit:
      process.env.NODE_ENV === 'production' ? 500 : Number.MAX_SAFE_INTEGER,
    ttl: 3_600_000, // 1 hour
  },
}) // 40 requests per minute (10 refreshes), 500 requests per hour in production (optimal UX), unlimited in dev
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(
    @Req() req: { user: { userId: string } },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<OverviewResponse> {
    const dateRange = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.analyticsService.getOverview(req.user.userId, dateRange);
  }

  @Get('monthly')
  getMonthly(
    @Req() req: { user: { userId: string } },
    @Query('months') months?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<MonthlyData[]> {
    const dateRange = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.analyticsService.getMonthly(
      req.user.userId,
      months ? Number(months) : 12,
      dateRange,
    );
  }

  @Get('categories')
  getCategories(
    @Req() req: { user: { userId: string } },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<CategoryData[]> {
    const dateRange = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.analyticsService.getCategories(req.user.userId, dateRange);
  }

  @Get('daily')
  getDailySpending(
    @Req() req: { user: { userId: string } },
    @Query('year') year?: string,
    @Query('month') month?: string,
  ): Promise<DailyData[]> {
    const yearNum = year ? Number(year) : undefined;
    const monthNum = month ? Number(month) : undefined;
    return this.analyticsService.getDailySpending(
      req.user.userId,
      yearNum,
      monthNum,
    );
  }
}
