import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CategoriesService } from '../categories/categories.service';

interface ListOptions {
  cursor?: string;
  limit?: number;
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async listUserTransactions(userId: string, opts: ListOptions) {
    const pageSize = Math.max(1, Math.min(opts?.limit ?? 20, 100));

    const where: Prisma.TransactionWhereInput = {
      userId: userId,
    };

    const cursor = opts?.cursor ? { id: opts.cursor } : undefined;

    const items = await this.prisma.transaction.findMany({
      where,
      orderBy: { id: 'desc' }, // Most recent first
      take: pageSize + 1,
      ...(cursor ? { cursor, skip: 1 } : {}),
      include: {
        category: true, // Include category if exists
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    const hasNext = items.length > pageSize;
    const data = hasNext ? items.slice(0, pageSize) : items;
    const nextCursor = hasNext ? String(data[data.length - 1]?.id) : null;
    return { data, nextCursor, pageSize };
  }

  async createForUser(userId: string, dto: CreateTransactionDto) {
    // Normalize date to start of day (00:00:00Z) for date-only storage
    const transactionDate = new Date(dto.date);
    transactionDate.setUTCHours(0, 0, 0, 0);

    // Resolve category name to ID
    // If no category provided, default to "Uncategorized" so transactions appear in charts
    const categoryNameToUse = dto.categoryName || 'Uncategorized';
    const category = await this.categoriesService.findByName(categoryNameToUse);
    const categoryId = category.id;

    const created = await this.prisma.transaction.create({
      data: {
        userId: userId,
        amount: dto.amount,
        type: dto.type,
        date: transactionDate,
        categoryId: categoryId,
        description: dto.description ?? null,
      },
      include: {
        category: true,
      },
    });
    return created;
  }

  async updateForUser(userId: string, id: string, dto: UpdateTransactionDto) {
    try {
      // First verify the transaction exists and belongs to the user
      const existing = await this.prisma.transaction.findFirst({
        where: {
          id: id,
          userId: userId,
        },
      });

      if (!existing) {
        throw new NotFoundException('Transaction not found or unauthorized');
      }

      const updateData: Prisma.TransactionUpdateInput = {};

      if (dto.amount !== undefined) {
        updateData.amount = dto.amount;
      }
      if (dto.type !== undefined) {
        updateData.type = dto.type;
      }
      if (dto.date !== undefined) {
        // Normalize date to start of day
        const transactionDate = new Date(dto.date);
        transactionDate.setUTCHours(0, 0, 0, 0);
        updateData.date = transactionDate;
      }
      if (dto.categoryName !== undefined) {
        if (dto.categoryName === null) {
          // Explicit null means remove category - default to "Uncategorized" instead
          const category =
            await this.categoriesService.findByName('Uncategorized');
          updateData.category = { connect: { id: category.id } };
        } else if (dto.categoryName === '') {
          // Empty string means use default "Uncategorized"
          const category =
            await this.categoriesService.findByName('Uncategorized');
          updateData.category = { connect: { id: category.id } };
        } else {
          const category = await this.categoriesService.findByName(
            dto.categoryName,
          );
          updateData.category = { connect: { id: category.id } };
        }
      }
      if (dto.description !== undefined) {
        updateData.description = dto.description ?? null;
      }

      const updated = await this.prisma.transaction.update({
        where: {
          id: id,
        },
        data: updateData,
        include: {
          category: true,
        },
      });
      return updated;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Transaction not found or unauthorized');
      }
      throw error;
    }
  }

  async deleteForUser(userId: string, id: string) {
    try {
      // First verify the transaction exists and belongs to the user
      const existing = await this.prisma.transaction.findFirst({
        where: {
          id: id,
          userId: userId,
        },
      });

      if (!existing) {
        throw new NotFoundException('Transaction not found or unauthorized');
      }

      // Hard delete the transaction
      await this.prisma.transaction.delete({
        where: {
          id: id,
        },
      });
      return { ok: true };
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Transaction not found or unauthorized');
      }
      throw error;
    }
  }
}
