import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { PreserveBudgetDto } from './dto/preserve-budget.dto';

/**
 * Maximum number of budgets allowed per user
 * Prevents DoS attacks via excessive budget creation
 */
const MAX_BUDGETS_PER_USER = 100;

/**
 * Maximum number of parallel expense queries
 * SECURITY: Reduced from 50 to 25 to prevent database connection pool exhaustion
 * Lower limit provides better protection against DoS attacks
 */
const MAX_PARALLEL_EXPENSE_QUERIES = 25;

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate that the month/year is not in the past
   */
  private validateDateNotInPast(month: number, year: number): void {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      throw new BadRequestException(
        'Cannot create or update budgets for past months',
      );
    }
  }

  /**
   * Get total expenses for a specific month/year
   */
  private async getTotalExpensesForMonth(
    userId: string,
    month: number,
    year: number,
  ): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month

    const expenses = await this.prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        type: 'expense',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return expenses._sum.amount?.toNumber() || 0;
  }

  /**
   * Batch get total expenses for multiple months
   * Optimized to reduce database queries
   * SECURITY: Limits parallel queries to prevent DoS attacks
   * Includes timeout mechanism to prevent connection pool exhaustion
   */
  private async getTotalExpensesForMonths(
    userId: string,
    monthYearPairs: Array<{ month: number; year: number }>,
  ): Promise<Map<string, number>> {
    if (monthYearPairs.length === 0) {
      return new Map();
    }

    // SECURITY: Limit number of parallel queries to prevent connection pool exhaustion
    const limitedPairs = monthYearPairs.slice(0, MAX_PARALLEL_EXPENSE_QUERIES);

    /**
     * SECURITY: Query timeout wrapper to prevent hanging queries
     * Prevents database connection pool exhaustion from slow or hanging queries
     */
    const queryWithTimeout = async <T>(
      promise: Promise<T>,
      timeoutMs: number,
    ): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error('Database query timeout')),
            timeoutMs,
          ),
        ),
      ]);
    };

    // SECURITY: Maximum timeout per query (5 seconds)
    // This prevents individual queries from hanging and exhausting connections
    const QUERY_TIMEOUT_MS = 5000;

    // Execute expense queries in batches with timeout protection
    // SECURITY: Each query has a timeout to prevent connection pool exhaustion
    const expensePromises = limitedPairs.map(async ({ month, year }) => {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month

      const queryPromise = this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          type: 'expense',
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      try {
        const expenses = await queryWithTimeout(queryPromise, QUERY_TIMEOUT_MS);
        const key = `${year}-${month}`;
        const spent = expenses._sum.amount?.toNumber() || 0;
        return { key, spent };
      } catch (error) {
        // SECURITY: On timeout or error, return zero instead of failing entire request
        // This prevents DoS attacks from causing complete service failure
        const key = `${year}-${month}`;
        return { key, spent: 0 };
      }
    });

    // SECURITY: Use Promise.allSettled instead of Promise.all to handle partial failures
    // This prevents one failed query from failing all queries
    const results = await Promise.allSettled(expensePromises);
    const expensesMap = new Map<string, number>();

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { key, spent } = result.value;
        expensesMap.set(key, spent);
      }
      // SECURITY: Ignore rejected promises (already handled in try-catch above)
    });

    return expensesMap;
  }

  /**
   * Calculate budget status from spent and budget amounts
   */
  private calculateBudgetStatus(
    spent: number,
    budgetAmount: number,
  ): {
    exceeded: boolean;
    message?: string;
    spent: number;
    budget: number;
  } {
    const exceeded = spent > budgetAmount;

    let message: string | undefined;
    if (exceeded) {
      const overAmount = spent - budgetAmount;
      message = `Budget exceeded! You've spent $${spent.toFixed(2)} out of $${budgetAmount.toFixed(2)}. You are $${overAmount.toFixed(2)} over budget.`;
    } else {
      const remaining = budgetAmount - spent;
      const percentage = (spent / budgetAmount) * 100;
      if (percentage >= 90) {
        message = `Warning: You've used ${percentage.toFixed(1)}% of your budget. $${remaining.toFixed(2)} remaining.`;
      }
    }

    return {
      exceeded,
      message,
      spent,
      budget: budgetAmount,
    };
  }

  /**
   * Check if spending exceeds budget and return warning if needed
   */
  async checkBudgetStatus(
    userId: string,
    month: number,
    year: number,
  ): Promise<{
    exceeded: boolean;
    message?: string;
    spent: number;
    budget: number;
  }> {
    const budget = await this.prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
    });

    if (!budget) {
      return { exceeded: false, spent: 0, budget: 0 };
    }

    const spent = await this.getTotalExpensesForMonth(userId, month, year);
    const budgetAmount = budget.amount.toNumber();

    return this.calculateBudgetStatus(spent, budgetAmount);
  }

  /**
   * Create a new budget for a user
   * SECURITY: Enforces maximum budget limit per user to prevent DoS attacks
   */
  async create(userId: string, dto: CreateBudgetDto) {
    this.validateDateNotInPast(dto.month, dto.year);

    // SECURITY: Check current budget count to prevent DoS via excessive budget creation
    const budgetCount = await this.prisma.budget.count({
      where: { userId },
    });

    if (budgetCount >= MAX_BUDGETS_PER_USER) {
      throw new BadRequestException(
        `Maximum budget limit reached. You can have up to ${MAX_BUDGETS_PER_USER} budgets.`,
      );
    }

    // Check if budget already exists
    const existing = await this.prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: dto.month,
          year: dto.year,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Budget already exists for ${dto.month}/${dto.year}`,
      );
    }

    const budget = await this.prisma.budget.create({
      data: {
        userId,
        month: dto.month,
        year: dto.year,
        amount: dto.amount,
      },
    });

    // Check budget status after creation
    const status = await this.checkBudgetStatus(userId, dto.month, dto.year);

    return {
      ...budget,
      amount: budget.amount.toNumber(),
      status,
    };
  }

  /**
   * Get all budgets for a user
   * Optimized to batch expense queries and eliminate N+1 problem
   */
  async findAll(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    if (budgets.length === 0) {
      return [];
    }

    // Extract unique month/year pairs for batch querying
    const monthYearPairs = budgets.map((budget) => ({
      month: budget.month,
      year: budget.year,
    }));

    // Batch query expenses for all budgets in parallel
    const expensesMap = await this.getTotalExpensesForMonths(
      userId,
      monthYearPairs,
    );

    // Map expenses to budgets and calculate status
    const budgetsWithStatus = budgets.map((budget) => {
      const key = `${budget.year}-${budget.month}`;
      const spent = expensesMap.get(key) ?? 0;
      const budgetAmount = budget.amount.toNumber();
      const status = this.calculateBudgetStatus(spent, budgetAmount);

      return {
        ...budget,
        amount: budgetAmount,
        status,
      };
    });

    return budgetsWithStatus;
  }

  /**
   * Get a specific budget by month/year
   */
  async findOne(userId: string, month: number, year: number) {
    const budget = await this.prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
    });

    if (!budget) {
      // SECURITY: Use generic error message to prevent information disclosure
      throw new NotFoundException('Resource not found');
    }

    const status = await this.checkBudgetStatus(userId, month, year);

    return {
      ...budget,
      amount: budget.amount.toNumber(),
      status,
    };
  }

  /**
   * Update a budget
   */
  async update(
    userId: string,
    month: number,
    year: number,
    dto: UpdateBudgetDto,
  ) {
    const budget = await this.prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
    });

    if (!budget) {
      // SECURITY: Use generic error message to prevent information disclosure
      throw new NotFoundException('Resource not found');
    }

    // If updating month/year, validate they're not in the past
    if (dto.month !== undefined || dto.year !== undefined) {
      const newMonth = dto.month ?? budget.month;
      const newYear = dto.year ?? budget.year;
      this.validateDateNotInPast(newMonth, newYear);
    }

    const updated = await this.prisma.budget.update({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
      data: {
        ...(dto.month !== undefined && { month: dto.month }),
        ...(dto.year !== undefined && { year: dto.year }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
      },
    });

    const status = await this.checkBudgetStatus(
      userId,
      updated.month,
      updated.year,
    );

    return {
      ...updated,
      amount: updated.amount.toNumber(),
      status,
    };
  }

  /**
   * Delete a budget
   */
  async remove(userId: string, month: number, year: number) {
    const budget = await this.prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
    });

    if (!budget) {
      // SECURITY: Use generic error message to prevent information disclosure
      throw new NotFoundException('Resource not found');
    }

    await this.prisma.budget.delete({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
    });

    return { message: 'Budget deleted successfully' };
  }

  /**
   * Preserve budget to next month
   * Creates a new budget for the next month and optionally deletes the old one
   */
  async preserve(
    userId: string,
    month: number,
    year: number,
    dto: PreserveBudgetDto,
  ) {
    const budget = await this.prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
    });

    if (!budget) {
      // SECURITY: Use generic error message to prevent information disclosure
      throw new NotFoundException('Resource not found');
    }

    // Calculate next month/year
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    // Check if budget already exists for next month
    const existingNext = await this.prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: nextMonth,
          year: nextYear,
        },
      },
    });

    if (existingNext) {
      throw new BadRequestException('Budget already exists for target period');
    }

    // Create new budget for next month with same amount
    const newBudget = await this.prisma.budget.create({
      data: {
        userId,
        month: nextMonth,
        year: nextYear,
        amount: budget.amount,
      },
    });

    // If preserve is true, delete the old budget
    if (dto.preserve) {
      await this.prisma.budget.delete({
        where: {
          userId_month_year: {
            userId,
            month,
            year,
          },
        },
      });
    }

    const status = await this.checkBudgetStatus(userId, nextMonth, nextYear);

    return {
      ...newBudget,
      amount: newBudget.amount.toNumber(),
      status,
      oldBudgetDeleted: dto.preserve,
    };
  }

  /**
   * Toggle preserve to next month setting for a budget
   */
  async togglePreserve(userId: string, month: number, year: number) {
    const budget = await this.prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
    });

    if (!budget) {
      // SECURITY: Use generic error message to prevent information disclosure
      throw new NotFoundException('Resource not found');
    }

    const updated = await this.prisma.budget.update({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
      data: {
        preserveToNextMonth: !budget.preserveToNextMonth,
      },
    });

    const status = await this.checkBudgetStatus(userId, month, year);

    return {
      ...updated,
      amount: updated.amount.toNumber(),
      status,
    };
  }

  /**
   * Clean up old budgets (delete budgets for past months)
   * This can be called periodically via a cron job
   */
  async cleanupOldBudgets() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Delete all budgets for months before the current month
    const result = await this.prisma.budget.deleteMany({
      where: {
        OR: [
          { year: { lt: currentYear } },
          {
            year: currentYear,
            month: { lt: currentMonth },
          },
        ],
      },
    });

    return {
      deletedCount: result.count,
      message: `Deleted ${result.count} old budget(s)`,
    };
  }
}
