import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AnalyticsThrottlerGuard } from '../common/guards/analytics-throttler.guard';
import {
  AnalyticsService,
  OverviewResponse,
  MonthlyData,
  CategoryData,
  DailyData,
} from './analytics.service';
import { DateRangeDto } from './dto/date-range.dto';
import { MonthlyAnalyticsDto } from './dto/monthly-analytics.dto';
import { DailyAnalyticsDto } from './dto/daily-analytics.dto';

// Use AnalyticsThrottlerGuard for stricter rate limiting on analytics endpoints
// Rate limiting enforced in all environments
// Limits: 50 requests per minute per user in production, 500 in development (10x for testing)
@UseGuards(JwtAuthGuard, AnalyticsThrottlerGuard)
@Throttle({
  analytics: {
    limit: process.env.NODE_ENV === 'production' ? 50 : 500, // 10x production limit in dev
    ttl: 60_000, // 1 minute
  },
})
// 50 requests per minute per user for analytics in production, 500 in development
@Controller('v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(
    @Req() req: { user: { userId: string } },
    @Query(ValidationPipe) query: DateRangeDto,
  ): Promise<OverviewResponse> {
    const dateRange = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    return this.analyticsService.getOverview(req.user.userId, dateRange);
  }

  @Get('monthly')
  getMonthly(
    @Req() req: { user: { userId: string } },
    @Query(ValidationPipe) query: MonthlyAnalyticsDto,
  ): Promise<{ data: MonthlyData[]; total: number; hasMore: boolean }> {
    const dateRange = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    return this.analyticsService.getMonthly(
      req.user.userId,
      query.months ?? 12,
      dateRange,
      query.limit ?? 100,
      query.offset ?? 0,
    );
  }

  @Get('categories')
  getCategories(
    @Req() req: { user: { userId: string } },
    @Query(ValidationPipe) query: DateRangeDto,
  ): Promise<CategoryData[]> {
    const dateRange = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    return this.analyticsService.getCategories(req.user.userId, dateRange);
  }

  @Get('daily')
  getDailySpending(
    @Req() req: { user: { userId: string } },
    @Query(ValidationPipe) query: DailyAnalyticsDto,
  ): Promise<DailyData[]> {
    return this.analyticsService.getDailySpending(
      req.user.userId,
      query.year,
      query.month,
    );
  }
}
