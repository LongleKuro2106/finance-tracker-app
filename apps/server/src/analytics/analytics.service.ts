import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { validateUUID } from '../common/utils/uuid-validator.util';

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Maximum allowed date range in days (1 year)
 */
const MAX_DATE_RANGE_DAYS = 365;

/**
 * Maximum number of category results to prevent DoS attacks
 * Limits query result size to prevent memory exhaustion
 */
const MAX_CATEGORY_RESULTS = 1000;

/**
 * Maximum number of monthly results to prevent DoS attacks
 * Limits query result size to prevent memory exhaustion
 */
const MAX_MONTHLY_RESULTS = 100;

/**
 * Maximum number of daily results to prevent DoS attacks
 * Limits query result size to prevent memory exhaustion (max 31 days per month)
 */
const MAX_DAILY_RESULTS = 31;

/**
 * Validates date range and throws if it exceeds the maximum allowed range
 * Also validates that dates are valid Date objects before calculation
 */
function validateDateRange(dateRange?: DateRange): void {
  if (!dateRange?.startDate || !dateRange?.endDate) {
    return;
  }

  // Validate that dates are valid Date objects
  if (
    !(dateRange.startDate instanceof Date) ||
    !(dateRange.endDate instanceof Date) ||
    isNaN(dateRange.startDate.getTime()) ||
    isNaN(dateRange.endDate.getTime())
  ) {
    throw new BadRequestException('Invalid date format');
  }

  const daysDiff = Math.ceil(
    (dateRange.endDate.getTime() - dateRange.startDate.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (daysDiff > MAX_DATE_RANGE_DAYS) {
    throw new BadRequestException(
      `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`,
    );
  }

  if (daysDiff < 0) {
    throw new BadRequestException('Start date must be before end date');
  }
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
    // SECURITY: Validate userId is a valid UUID before database operations
    validateUUID(userId, 'User ID');

    // Validate date range
    validateDateRange(dateRange);

    const where: {
      userId: string;
      date?: { gte?: Date; lte?: Date };
    } = {
      userId,
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      where.date = {};
      if (dateRange.startDate) {
        where.date.gte = dateRange.startDate;
      }
      if (dateRange.endDate) {
        where.date.lte = dateRange.endDate;
      }
    }

    // Use database-level aggregation instead of loading all transactions
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [incomeResult, expenseResult] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.prisma.transaction.aggregate({
        where: {
          ...where,
          type: 'income',
        },
        _sum: {
          amount: true,
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const totalRevenue = Number(incomeResult._sum.amount ?? 0);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
   * Uses database-level aggregation for performance
   */
  async getCategories(
    userId: string,
    dateRange?: DateRange,
  ): Promise<CategoryData[]> {
    // SECURITY: Validate userId is a valid UUID before using in raw SQL query
    // This prevents SQL injection attacks even if userId somehow contains malicious input
    // validateUUID throws BadRequestException if invalid, preventing query execution
    validateUUID(userId, 'User ID');

    // Validate date range to prevent DoS attacks via large date ranges
    validateDateRange(dateRange);

    const where: {
      userId: string;
      date?: { gte?: Date; lte?: Date };
    } = {
      userId,
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      where.date = {};
      if (dateRange.startDate) {
        where.date.gte = dateRange.startDate;
      }
      if (dateRange.endDate) {
        where.date.lte = dateRange.endDate;
      }
    }

    // Optimized query using raw SQL with JOIN to combine aggregation and category name lookup
    // Single query eliminates N+1 issue by joining Category table
    // SECURITY: UUID validation performed above via validateUUID call - throws if invalid
    // Prisma's $queryRaw uses parameterized queries, preventing SQL injection
    // All user inputs (userId, startDate, endDate) are parameterized, not concatenated
    const startDate = dateRange?.startDate ?? new Date(0);
    const endDate = dateRange?.endDate ?? new Date();

    // Validate dates are valid Date objects to prevent injection
    if (
      !(startDate instanceof Date) ||
      !(endDate instanceof Date) ||
      isNaN(startDate.getTime()) ||
      isNaN(endDate.getTime())
    ) {
      throw new BadRequestException('Invalid date format');
    }

    type CategoryTotalRow = {
      categoryId: number | null;
      categoryName: string | null;
      type: string;
      total: number;
    };

    // SECURITY: Prisma's $queryRaw uses parameterized queries via template literals
    // ${userId}::uuid - Prisma automatically parameterizes this, preventing SQL injection
    // ${startDate}::date and ${endDate}::date - Also parameterized by Prisma
    // No string concatenation occurs - all values are passed as parameters to PostgreSQL
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const categoryTotalsWithNames = (await this.prisma.$queryRaw<
      CategoryTotalRow[]
    >`
      SELECT
        t."categoryId",
        c.name as "categoryName",
        t.type,
        SUM(t.amount)::decimal as total
      FROM "Transaction" t
      LEFT JOIN "Category" c ON t."categoryId" = c.id
      WHERE t."userId" = ${userId}::uuid
        AND t.date >= ${startDate}::date
        AND t.date <= ${endDate}::date
      GROUP BY t."categoryId", c.name, t.type
      ORDER BY ABS(SUM(t.amount)) DESC
    `) as CategoryTotalRow[];

    // Group results by category - category names included from JOIN query
    const categoryMap = new Map<
      number | null,
      { categoryName: string | null; income: number; expense: number }
    >();

    categoryTotalsWithNames.forEach((row) => {
      const categoryId = row.categoryId ?? null;
      const categoryName = row.categoryName ?? null;
      const amount = Number(row.total ?? 0);

      const existing = categoryMap.get(categoryId);
      if (existing) {
        if (row.type === 'income') {
          existing.income += amount;
        } else {
          existing.expense += amount;
        }
      } else {
        categoryMap.set(categoryId, {
          categoryName,
          income: row.type === 'income' ? amount : 0,
          expense: row.type === 'expense' ? amount : 0,
        });
      }
    });

    // Convert to array and calculate totals
    const categories: CategoryData[] = Array.from(categoryMap.entries()).map(
      ([categoryId, data]) => ({
        categoryId,
        categoryName: data.categoryName,
        income: data.income,
        expense: data.expense,
        total: data.income - data.expense,
      }),
    );

    // Sort by absolute total (most impactful categories first)
    const sortedCategories = categories.sort(
      (a, b) => Math.abs(b.total) - Math.abs(a.total),
    );

    // SECURITY: Limit result size to prevent DoS attacks
    return sortedCategories.slice(0, MAX_CATEGORY_RESULTS);
  }

  /**
   * Get monthly trends
   * Returns income and expense grouped by month
   * Uses database-level aggregation for performance
   */
  async getMonthly(
    userId: string,
    months: number = 12,
    dateRange?: DateRange,
  ): Promise<MonthlyData[]> {
    // SECURITY: Validate userId is a valid UUID before using in raw SQL query
    // validateUUID throws BadRequestException if invalid, preventing query execution
    validateUUID(userId, 'User ID');

    // SECURITY: Validate and limit months parameter - maximum 24 months (2 years)
    // Prevents DoS attacks via excessive data requests
    const validatedMonths = Math.max(1, Math.min(months, 24));

    const endDate = dateRange?.endDate ?? new Date();
    const startDate =
      dateRange?.startDate ??
      (() => {
        const date = new Date();
        date.setMonth(date.getMonth() - validatedMonths);
        return date;
      })();

    // Validate date range if both dates are provided
    if (dateRange?.startDate && dateRange?.endDate) {
      validateDateRange(dateRange);
    } else {
      // Validate calculated date range
      const calculatedRange: DateRange = { startDate, endDate };
      validateDateRange(calculatedRange);
    }

    // Use raw query for efficient month/year extraction and aggregation
    // SECURITY: UUID validation performed above via validateUUID call - throws if invalid
    // Prisma's parameterized query builder prevents SQL injection
    // All user inputs are parameterized, not concatenated

    // Validate dates are valid Date objects to prevent injection
    if (
      !(startDate instanceof Date) ||
      !(endDate instanceof Date) ||
      isNaN(startDate.getTime()) ||
      isNaN(endDate.getTime())
    ) {
      throw new BadRequestException('Invalid date format');
    }

    type MonthlyAggregateRow = {
      year: number;
      month: number;
      type: string;
      total: number;
    };

    // SECURITY: Prisma's $queryRaw uses parameterized queries via template literals
    // ${userId}::uuid - Prisma automatically parameterizes this, preventing SQL injection
    // ${startDate}::date and ${endDate}::date - Also parameterized by Prisma
    // No string concatenation occurs - all values are passed as parameters to PostgreSQL
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const monthlyAggregates = (await this.prisma.$queryRaw<
      MonthlyAggregateRow[]
    >`
      SELECT
        EXTRACT(YEAR FROM date)::int as year,
        EXTRACT(MONTH FROM date)::int as month,
        type,
        SUM(amount)::decimal as total
      FROM "Transaction"
      WHERE "userId" = ${userId}::uuid
        AND date >= ${startDate}::date
        AND date <= ${endDate}::date
      GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date), type
      ORDER BY year, month
    `) as MonthlyAggregateRow[];

    // Group by month and year
    const monthlyMap = new Map<
      string,
      { income: number; expense: number; month: number; year: number }
    >();

    monthlyAggregates.forEach((aggregate) => {
      const key = `${aggregate.year}-${aggregate.month}`;
      const amount = Number(aggregate.total);

      const existing = monthlyMap.get(key);
      if (existing) {
        if (aggregate.type === 'income') {
          existing.income += amount;
        } else {
          existing.expense += amount;
        }
      } else {
        monthlyMap.set(key, {
          month: aggregate.month,
          year: aggregate.year,
          income: aggregate.type === 'income' ? amount : 0,
          expense: aggregate.type === 'expense' ? amount : 0,
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

    // SECURITY: Limit result size to prevent DoS attacks
    return monthlyData.slice(0, MAX_MONTHLY_RESULTS);
  }

  /**
   * Get daily spending for the current month
   * Returns expense totals grouped by day for the current month
   * Uses database-level aggregation for performance
   */
  async getDailySpending(
    userId: string,
    year?: number,
    month?: number,
  ): Promise<DailyData[]> {
    // SECURITY: Validate userId is a valid UUID before using in raw SQL query
    // validateUUID throws BadRequestException if invalid, preventing query execution
    validateUUID(userId, 'User ID');

    // SECURITY: Validate year and month parameters to prevent injection
    // Year must be reasonable (1900-2100), month must be 1-12
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1; // 1-12

    if (targetYear < 1900 || targetYear > 2100) {
      throw new BadRequestException('Invalid year parameter');
    }
    if (targetMonth < 1 || targetMonth > 12) {
      throw new BadRequestException('Invalid month parameter (must be 1-12)');
    }

    // Get first and last day of the target month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0); // Last day of month

    // Validate dates are valid Date objects to prevent injection
    if (
      !(startDate instanceof Date) ||
      !(endDate instanceof Date) ||
      isNaN(startDate.getTime()) ||
      isNaN(endDate.getTime())
    ) {
      throw new BadRequestException('Invalid date format');
    }

    // SECURITY: UUID validation performed above via validateUUID call - throws if invalid
    // Prisma's parameterized queries prevent SQL injection
    // All user inputs are parameterized, not concatenated

    // Use database-level aggregation
    type DailyAggregateRow = {
      day: number;
      total: number;
    };

    // SECURITY: Prisma's $queryRaw uses parameterized queries via template literals
    // ${userId}::uuid - Prisma automatically parameterizes this, preventing SQL injection
    // ${startDate}::date and ${endDate}::date - Also parameterized by Prisma
    // No string concatenation occurs - all values are passed as parameters to PostgreSQL
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const dailyAggregates = (await this.prisma.$queryRaw<DailyAggregateRow[]>`
      SELECT
        EXTRACT(DAY FROM date)::int as day,
        SUM(amount)::decimal as total
      FROM "Transaction"
      WHERE "userId" = ${userId}::uuid
        AND type = 'expense'
        AND date >= ${startDate}::date
        AND date <= ${endDate}::date
      GROUP BY EXTRACT(DAY FROM date)
      ORDER BY day
    `) as DailyAggregateRow[];

    // Create map for quick lookup
    const dailyMap = new Map<number, number>();
    dailyAggregates.forEach((aggregate) => {
      dailyMap.set(aggregate.day, Number(aggregate.total));
    });

    // Convert to array and fill missing days with 0
    const daysInMonth = Math.min(endDate.getDate(), MAX_DAILY_RESULTS);
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

    // SECURITY: Limit result size to prevent DoS attacks
    return dailyData.slice(0, MAX_DAILY_RESULTS);
  }
}
