import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Maximum allowed date range in days (1 year)
 */
const MAX_DATE_RANGE_DAYS = 365;

/**
 * Validates date range and throws if it exceeds the maximum allowed range
 */
function validateDateRange(dateRange?: DateRange): void {
  if (!dateRange?.startDate || !dateRange?.endDate) {
    return;
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
    // Validate date range
    validateDateRange(dateRange);

    const where: Prisma.TransactionWhereInput = {
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
   * Uses database-level aggregation for performance
   */
  async getCategories(
    userId: string,
    dateRange?: DateRange,
  ): Promise<CategoryData[]> {
    // Validate date range
    validateDateRange(dateRange);

    const where: Prisma.TransactionWhereInput = {
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

    // Use database-level aggregation with groupBy
    const categoryTotals = await this.prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where,
      _sum: {
        amount: true,
      },
    });

    // Get category names for all unique category IDs
    const categoryIds = [
      ...new Set(
        categoryTotals
          .map((t) => t.categoryId)
          .filter((id): id is number => id !== null),
      ),
    ];

    const categoriesMap = new Map<number, { name: string }>();
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
        categoriesMap.set(cat.id, { name: cat.name });
      });
    }

    // Group results by category
    const categoryMap = new Map<
      number | null,
      { categoryName: string | null; income: number; expense: number }
    >();

    categoryTotals.forEach((total) => {
      const categoryId = total.categoryId ?? null;
      const categoryName =
        total.categoryId !== null
          ? (categoriesMap.get(total.categoryId)?.name ?? null)
          : null;
      const amount = Number(total._sum.amount ?? 0);

      const existing = categoryMap.get(categoryId);
      if (existing) {
        if (total.type === 'income') {
          existing.income += amount;
        } else {
          existing.expense += amount;
        }
      } else {
        categoryMap.set(categoryId, {
          categoryName,
          income: total.type === 'income' ? amount : 0,
          expense: total.type === 'expense' ? amount : 0,
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
    return categories.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
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
    const endDate = dateRange?.endDate ?? new Date();
    const startDate =
      dateRange?.startDate ??
      (() => {
        const date = new Date();
        date.setMonth(date.getMonth() - months);
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
    // This is safe because we're using Prisma's parameterized query builder
    const monthlyAggregates = await this.prisma.$queryRaw<
      Array<{
        year: number;
        month: number;
        type: string;
        total: number;
      }>
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
    `;

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

    return monthlyData;
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
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1; // 1-12

    // Get first and last day of the target month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0); // Last day of month

    // Use database-level aggregation
    const dailyAggregates = await this.prisma.$queryRaw<
      Array<{
        day: number;
        total: number;
      }>
    >`
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
    `;

    // Create map for quick lookup
    const dailyMap = new Map<number, number>();
    dailyAggregates.forEach((aggregate) => {
      dailyMap.set(aggregate.day, Number(aggregate.total));
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
