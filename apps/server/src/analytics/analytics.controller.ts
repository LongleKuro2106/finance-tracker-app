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
import {
  OverviewQueryDto,
  MonthlyQueryDto,
  CategoriesQueryDto,
  DailySpendingQueryDto,
} from './dto/analytics-query.dto';

// Use DevThrottlerGuard which disables throttling in development
@UseGuards(JwtAuthGuard, DevThrottlerGuard)
@Throttle({
  default: {
    limit: process.env.NODE_ENV === 'production' ? 30 : Number.MAX_SAFE_INTEGER,
    ttl: 60_000, // 1 minute
  },
  long: {
    limit:
      process.env.NODE_ENV === 'production' ? 1000 : Number.MAX_SAFE_INTEGER,
    ttl: 3_600_000, // 1 hour
  },
}) // Stricter rate limits: 30 requests per minute, 1000 requests per hour in production
@Controller('v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(
    @Req() req: { user: { userId: string } },
    @Query() query: OverviewQueryDto,
  ): Promise<OverviewResponse> {
    const dateRange = {
      startDate: query.startDate,
      endDate: query.endDate,
    };

    return this.analyticsService.getOverview(req.user.userId, dateRange);
  }

  @Get('monthly')
  getMonthly(
    @Req() req: { user: { userId: string } },
    @Query() query: MonthlyQueryDto,
  ): Promise<MonthlyData[]> {
    const dateRange = {
      startDate: query.startDate,
      endDate: query.endDate,
    };

    return this.analyticsService.getMonthly(
      req.user.userId,
      query.months ?? 12,
      dateRange,
    );
  }

  @Get('categories')
  getCategories(
    @Req() req: { user: { userId: string } },
    @Query() query: CategoriesQueryDto,
  ): Promise<CategoryData[]> {
    const dateRange = {
      startDate: query.startDate,
      endDate: query.endDate,
    };

    return this.analyticsService.getCategories(req.user.userId, dateRange);
  }

  @Get('daily')
  getDailySpending(
    @Req() req: { user: { userId: string } },
    @Query() query: DailySpendingQueryDto,
  ): Promise<DailyData[]> {
    return this.analyticsService.getDailySpending(
      req.user.userId,
      query.year,
      query.month,
    );
  }
}
