import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

// Maximum allowed date range in days (1 year)
const MAX_DATE_RANGE_DAYS = 365;

/**
 * Validate and normalize date range
 * Enforces maximum date range limit to prevent DoS attacks
 */
function validateDateRange(dateRange?: DateRange): DateRange | undefined {
  if (!dateRange?.startDate && !dateRange?.endDate) {
    return undefined;
  }

  const startDate = dateRange.startDate
    ? new Date(dateRange.startDate)
    : undefined;
  const endDate = dateRange.endDate ? new Date(dateRange.endDate) : undefined;

  // If both dates are provided, validate the range
  if (startDate && endDate) {
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff < 0) {
      throw new BadRequestException(
        'Start date must be before or equal to end date',
      );
    }

    if (daysDiff > MAX_DATE_RANGE_DAYS) {
      throw new BadRequestException(
        `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days (1 year)`,
      );
    }
  }

  // If only one date is provided, enforce a default range
  if (startDate && !endDate) {
    const defaultEndDate = new Date(startDate);
    defaultEndDate.setDate(defaultEndDate.getDate() + MAX_DATE_RANGE_DAYS);
    return { startDate, endDate: defaultEndDate };
  }

  if (!startDate && endDate) {
    const defaultStartDate = new Date(endDate);
    defaultStartDate.setDate(defaultStartDate.getDate() - MAX_DATE_RANGE_DAYS);
    return { startDate: defaultStartDate, endDate };
  }

  return { startDate, endDate };
}

export interface OverviewResponse {
  totalRevenue: number;
  totalExpenses: number;
  netBalance: number;
}

export interface MonthlyData {
  month: number;
  year: number;
  date: string; // ISO date string (YYYY-MM format) for easier frontend use
  income: number;
  expense: number;
  savings: number; // income - expense
}

export interface CategoryData {
  categoryId: number | null;
  categoryName: string | null;
  income: number;
  expense: number;
  total: number; // income - expense (net for this category)
}

export interface DailyData {
  day: number; // Day of month (1-31)
  date: string; // ISO date string (YYYY-MM-DD format)
  expense: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get overview statistics for a user
   * Returns total revenue, expenses, and net balance
   * Uses database-level aggregation for performance
   */
  async getOverview(
    userId: string,
    dateRange?: DateRange,
  ): Promise<OverviewResponse> {
    // Validate and normalize date range
    const validatedRange = validateDateRange(dateRange);

    const where: Prisma.TransactionWhereInput = {
      userId,
    };

    if (validatedRange?.startDate || validatedRange?.endDate) {
      where.date = {};
      if (validatedRange.startDate) {
        where.date.gte = validatedRange.startDate;
      }
      if (validatedRange.endDate) {
        where.date.lte = validatedRange.endDate;
      }
    }

    // Use database-level aggregation instead of loading all transactions
    // This prevents memory exhaustion for users with large transaction histories
    const [incomeResult, expenseResult] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          ...where,
          type: 'income',
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.transaction.aggregate({
        where: {
          ...where,
          type: 'expense',
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const totalRevenue = Number(incomeResult._sum.amount ?? 0);
    const totalExpenses = Number(expenseResult._sum.amount ?? 0);

    return {
      totalRevenue,
      totalExpenses,
      netBalance: totalRevenue - totalExpenses,
    };
  }

  /**
   * Get breakdown by category
   * Groups transactions by category, separating income and expense
   * Optimized for pie charts and bar charts
   * Uses database-level aggregation for performance
   */
  async getCategories(
    userId: string,
    dateRange?: DateRange,
  ): Promise<CategoryData[]> {
    // Validate and normalize date range
    const validatedRange = validateDateRange(dateRange);

    const where: Prisma.TransactionWhereInput = {
      userId,
    };

    if (validatedRange?.startDate || validatedRange?.endDate) {
      where.date = {};
      if (validatedRange.startDate) {
        where.date.gte = validatedRange.startDate;
      }
      if (validatedRange.endDate) {
        where.date.lte = validatedRange.endDate;
      }
    }

    // Use database-level aggregation with groupBy
    // This prevents loading all transactions into memory
    const categoryAggregations = await this.prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where,
      _sum: {
        amount: true,
      },
    });

    // Fetch category names in a single query
    const categoryIds = [
      ...new Set(
        categoryAggregations
          .map((agg) => agg.categoryId)
          .filter((id): id is number => id !== null),
      ),
    ];

    const categoriesMap = new Map<number, string>();
    if (categoryIds.length > 0) {
      const categories = await this.prisma.category.findMany({
        where: {
          id: { in: categoryIds },
        },
        select: {
          id: true,
          name: true,
        },
      });

      categories.forEach((cat) => {
        categoriesMap.set(cat.id, cat.name);
      });
    }

    // Group aggregated results by category
    const categoryDataMap = new Map<
      number | null,
      { categoryName: string | null; income: number; expense: number }
    >();

    categoryAggregations.forEach((agg) => {
      const categoryId = agg.categoryId ?? null;
      const categoryName = agg.categoryId
        ? (categoriesMap.get(agg.categoryId) ?? null)
        : null;
      const amount = Number(agg._sum.amount ?? 0);

      const existing = categoryDataMap.get(categoryId);
      if (existing) {
        if (agg.type === 'income') {
          existing.income += amount;
        } else {
          existing.expense += amount;
        }
      } else {
        categoryDataMap.set(categoryId, {
          categoryName,
          income: agg.type === 'income' ? amount : 0,
          expense: agg.type === 'expense' ? amount : 0,
        });
      }
    });

    // Convert to array and calculate totals
    const categories: CategoryData[] = Array.from(
      categoryDataMap.entries(),
    ).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.categoryName,
      income: data.income,
      expense: data.expense,
      total: data.income - data.expense,
    }));

    // Sort by absolute total (most impactful categories first)
    return categories.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }

  /**
   * Get monthly trends
   * Returns income and expense grouped by month
   * Optimized for line charts
   * Uses database-level aggregation for performance
   */
  async getMonthly(
    userId: string,
    months: number = 12,
    dateRange?: DateRange,
  ): Promise<MonthlyData[]> {
    // Validate months parameter (max 12 months)
    const validatedMonths = Math.min(Math.max(1, months), 12);

    const endDate = dateRange?.endDate ?? new Date();
    const startDate =
      dateRange?.startDate ??
      (() => {
        const date = new Date();
        date.setMonth(date.getMonth() - validatedMonths);
        return date;
      })();

    // Validate date range
    const validatedRange = validateDateRange({ startDate, endDate });
    if (
      !validatedRange ||
      !validatedRange.startDate ||
      !validatedRange.endDate
    ) {
      throw new BadRequestException('Invalid date range');
    }

    // Use raw SQL for efficient month/year grouping with aggregation
    // This prevents loading all transactions into memory
    const monthlyAggregations = await this.prisma.$queryRaw<
      Array<{
        year: number;
        month: number;
        type: string;
        total: bigint;
      }>
    >`
      SELECT
        EXTRACT(YEAR FROM date)::integer AS year,
        EXTRACT(MONTH FROM date)::integer AS month,
        type,
        SUM(amount) AS total
      FROM "Transaction"
      WHERE "userId" = ${userId}::uuid
        AND date >= ${validatedRange.startDate}::date
        AND date <= ${validatedRange.endDate}::date
      GROUP BY year, month, type
      ORDER BY year, month
    `;

    // Group by month and year
    const monthlyMap = new Map<
      string,
      { income: number; expense: number; month: number; year: number }
    >();

    monthlyAggregations.forEach((agg) => {
      const key = `${agg.year}-${agg.month}`;
      const amount = Number(agg.total);

      const existing = monthlyMap.get(key);
      if (existing) {
        if (agg.type === 'income') {
          existing.income += amount;
        } else {
          existing.expense += amount;
        }
      } else {
        monthlyMap.set(key, {
          month: agg.month,
          year: agg.year,
          income: agg.type === 'income' ? amount : 0,
          expense: agg.type === 'expense' ? amount : 0,
        });
      }
    });

    // Convert to array, add date string, calculate savings, and sort by date
    const monthlyData: MonthlyData[] = Array.from(monthlyMap.values())
      .map((data) => ({
        ...data,
        date: `${data.year}-${String(data.month).padStart(2, '0')}`, // YYYY-MM format
        savings: data.income - data.expense,
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

    return monthlyData;
  }

  /**
   * Get daily spending for the current month
   * Returns expense totals grouped by day for the current month
   * Optimized for daily spending line charts
   * Uses database-level aggregation for performance
   */
  async getDailySpending(
    userId: string,
    year?: number,
    month?: number,
  ): Promise<DailyData[]> {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1; // 1-12

    // Validate month range
    if (targetMonth < 1 || targetMonth > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }

    // Validate year range (reasonable bounds)
    const currentYear = now.getFullYear();
    if (targetYear < 2000 || targetYear > currentYear + 1) {
      throw new BadRequestException(
        `Year must be between 2000 and ${currentYear + 1}`,
      );
    }

    // Get first and last day of the target month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0); // Last day of month

    // Use database-level aggregation instead of loading all transactions
    const dailyAggregations = await this.prisma.$queryRaw<
      Array<{
        day: number;
        total: bigint;
      }>
    >`
      SELECT
        EXTRACT(DAY FROM date)::integer AS day,
        SUM(amount) AS total
      FROM "Transaction"
      WHERE "userId" = ${userId}::uuid
        AND type = 'expense'
        AND date >= ${startDate}::date
        AND date <= ${endDate}::date
      GROUP BY day
      ORDER BY day
    `;

    // Create map for quick lookup
    const dailyMap = new Map<number, number>();
    dailyAggregations.forEach((agg) => {
      dailyMap.set(agg.day, Number(agg.total));
    });

    // Convert to array and fill missing days with 0
    const daysInMonth = endDate.getDate();
    const dailyData: DailyData[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const expense = dailyMap.get(day) ?? 0;
      const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyData.push({
        day,
        date: dateStr,
        expense,
      });
    }

    return dailyData;
  }
}
