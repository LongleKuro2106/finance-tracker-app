import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
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
}

export interface CategoryData {
  categoryId: number | null;
  categoryName: string | null;
  income: number;
  expense: number;
  total: number; // income - expense (net for this category)
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get overview statistics for a user
   * Returns total revenue, expenses, and net balance
   */
  async getOverview(
    userId: string,
    dateRange?: DateRange,
  ): Promise<OverviewResponse> {
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

    // Get all transactions in the date range
    const transactions = await this.prisma.transaction.findMany({
      where,
      select: {
        type: true,
        amount: true,
      },
    });

    let totalRevenue = 0;
    let totalExpenses = 0;

    transactions.forEach((transaction) => {
      const amount = Number(transaction.amount);
      if (transaction.type === 'income') {
        totalRevenue += amount;
      } else {
        totalExpenses += amount;
      }
    });

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
   */
  async getCategories(
    userId: string,
    dateRange?: DateRange,
  ): Promise<CategoryData[]> {
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

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        category: true,
      },
    });

    // Group by category (combining income and expense)
    const categoryMap = new Map<
      number | null,
      { categoryName: string | null; income: number; expense: number }
    >();

    transactions.forEach((transaction) => {
      const categoryId = transaction.categoryId ?? null;
      const categoryName = transaction.category?.name ?? null;
      const amount = Number(transaction.amount);

      const existing = categoryMap.get(categoryId);
      if (existing) {
        if (transaction.type === 'income') {
          existing.income += amount;
        } else {
          existing.expense += amount;
        }
      } else {
        categoryMap.set(categoryId, {
          categoryName,
          income: transaction.type === 'income' ? amount : 0,
          expense: transaction.type === 'expense' ? amount : 0,
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
   * Optimized for line charts
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

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        type: true,
        amount: true,
        date: true,
      },
    });

    // Group by month and year
    const monthlyMap = new Map<
      string,
      { income: number; expense: number; month: number; year: number }
    >();

    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const month = date.getMonth() + 1; // 1-12
      const year = date.getFullYear();
      const key = `${year}-${month}`;
      const amount = Number(transaction.amount);

      const existing = monthlyMap.get(key);
      if (existing) {
        if (transaction.type === 'income') {
          existing.income += amount;
        } else {
          existing.expense += amount;
        }
      } else {
        monthlyMap.set(key, {
          month,
          year,
          income: transaction.type === 'income' ? amount : 0,
          expense: transaction.type === 'expense' ? amount : 0,
        });
      }
    });

    // Convert to array, add date string, and sort by date
    const monthlyData: MonthlyData[] = Array.from(monthlyMap.values())
      .map((data) => ({
        ...data,
        date: `${data.year}-${String(data.month).padStart(2, '0')}`, // YYYY-MM format
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

    return monthlyData;
  }
}
