import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import { Prisma as PrismaClient } from '@prisma/client';
import { validateUUID } from '../common/utils/validation.util';

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

// Maximum allowed date range in days (1 year)
// Prevents resource exhaustion from extremely large queries
// Database-level aggregation is used to minimize memory usage
// Query timeout (30 seconds) provides additional protection
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
    // Validate userId UUID format (defense in depth)
    validateUUID(userId, 'User ID');

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
    // Validate userId UUID format (defense in depth)
    validateUUID(userId, 'User ID');

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
    // Prevents loading all transactions into memory
    const categoryAggregations = await this.prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where,
      _sum: {
        amount: true,
      },
    });

    // Limit result set to prevent DoS (max 1000 categories)
    if (categoryAggregations.length > 1000) {
      throw new BadRequestException(
        'Result set too large. Please narrow your date range.',
      );
    }

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
    limit: number = 100,
    offset: number = 0,
  ): Promise<{ data: MonthlyData[]; total: number; hasMore: boolean }> {
    // Validate userId UUID format (defense in depth)
    validateUUID(userId, 'User ID');

    // Validate months parameter (max 12 months)
    const validatedMonths = Math.min(Math.max(1, months), 12);

    // SECURITY FIX: Add pagination parameters with validation
    const validatedLimit = Math.min(Math.max(1, limit), 1000); // Max 1000 per page
    const validatedOffset = Math.max(0, offset);

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

    // SECURITY FIX: First get total count for pagination metadata
    const countResult = await Promise.race([
      this.prisma.$queryRaw<Array<{ count: bigint }>>(
        PrismaClient.sql`
          SELECT COUNT(DISTINCT (EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)))::bigint AS count
          FROM "Transaction"
          WHERE "userId" = ${userId}::uuid
            AND date >= ${validatedRange.startDate}::date
            AND date <= ${validatedRange.endDate}::date
        `,
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new BadRequestException('Query timeout exceeded')),
          10000,
        ),
      ),
    ]);
    const total = Number(countResult[0]?.count ?? 0);

    // Use Prisma.sql for explicit parameterization to prevent SQL injection
    // All parameters validated before query execution:
    // - userId: Validated as UUID format (validateUUID)
    // - dates: Validated and normalized (validateDateRange)
    // - limit/offset: Validated and bounded
    // Query timeout: 10 seconds
    // SECURITY FIX: Added pagination with LIMIT and OFFSET
    const monthlyAggregations = await Promise.race([
      this.prisma.$queryRaw<
        Array<{
          year: number;
          month: number;
          type: string;
          total: bigint;
        }>
      >(
        PrismaClient.sql`
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
          LIMIT ${validatedLimit}
          OFFSET ${validatedOffset}
        `,
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new BadRequestException('Query timeout exceeded')),
          10000, // Query timeout: 10 seconds
        ),
      ),
    ]);

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

    // SECURITY FIX: Return paginated response with metadata
    return {
      data: monthlyData,
      total,
      hasMore: validatedOffset + monthlyData.length < total,
    };
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
    // Validate userId UUID format (defense in depth)
    validateUUID(userId, 'User ID');

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

    // Use Prisma.sql for explicit parameterization to prevent SQL injection
    // All parameters validated before query execution:
    // - userId: Validated as UUID format (validateUUID)
    // - dates: Validated year/month ranges
    // Query timeout: 10 seconds
    // Prevents loading all transactions into memory and uses efficient database aggregation
    const dailyAggregations = await Promise.race([
      this.prisma.$queryRaw<
        Array<{
          day: number;
          total: bigint;
        }>
      >(
        PrismaClient.sql`
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
          LIMIT 100
        `,
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new BadRequestException('Query timeout exceeded')),
          10000, // Query timeout: 10 seconds
        ),
      ),
    ]);

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
