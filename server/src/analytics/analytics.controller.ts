import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  AnalyticsService,
  OverviewResponse,
  MonthlyData,
  CategoryData,
} from './analytics.service';

@UseGuards(JwtAuthGuard)
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
}
