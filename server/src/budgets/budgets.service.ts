import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { PreserveBudgetDto } from './dto/preserve-budget.dto';

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
   * Create a new budget for a user
   */
  async create(userId: string, dto: CreateBudgetDto) {
    this.validateDateNotInPast(dto.month, dto.year);

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
   */
  async findAll(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Get status for each budget
    const budgetsWithStatus = await Promise.all(
      budgets.map(async (budget) => {
        const status = await this.checkBudgetStatus(
          userId,
          budget.month,
          budget.year,
        );
        return {
          ...budget,
          amount: budget.amount.toNumber(),
          status,
        };
      }),
    );

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
      throw new NotFoundException(`Budget not found for ${month}/${year}`);
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
      throw new NotFoundException(`Budget not found for ${month}/${year}`);
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
      throw new NotFoundException(`Budget not found for ${month}/${year}`);
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
      throw new NotFoundException(`Budget not found for ${month}/${year}`);
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
      throw new BadRequestException(
        `Budget already exists for ${nextMonth}/${nextYear}`,
      );
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
      throw new NotFoundException(`Budget not found for ${month}/${year}`);
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
