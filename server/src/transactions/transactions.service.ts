import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

interface ListOptions {
  cursor?: string;
  limit?: number;
}

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listUserTransactions(userId: string, opts: ListOptions) {
    const pageSize = Math.max(1, Math.min(opts?.limit ?? 20, 100));

    const where: Prisma.TransactionsWhereInput = {
      UserID: userId,
    };

    const cursor = opts?.cursor
      ? { TransactionID: Number(opts.cursor) }
      : undefined;

    const items = await this.prisma.transactions.findMany({
      where,
      orderBy: { TransactionID: 'asc' },
      take: pageSize + 1,
      ...(cursor ? { cursor, skip: 1 } : {}),
      include: {
        Category: true, // Include custom category if exists
        User: {
          select: {
            UserID: true,
            Username: true,
            Email: true,
          },
        },
      },
    });

    const hasNext = items.length > pageSize;
    const data = hasNext ? items.slice(0, pageSize) : items;
    const nextCursor = hasNext
      ? String(data[data.length - 1]?.TransactionID)
      : null;
    return { data, nextCursor, pageSize };
  }

  async createForUser(userId: string, dto: CreateTransactionDto) {
    const created = await this.prisma.transactions.create({
      data: {
        UserID: userId,
        Amount: dto.amount,
        Type: dto.type,
        TransactionDate: new Date(dto.transactionDate),
        DefaultCategory: dto.defaultCategory ?? null,
        CategoryID: dto.categoryId ?? null,
        Description: dto.description ?? null,
      },
    });
    return created;
  }

  async updateForUser(userId: string, id: number, dto: UpdateTransactionDto) {
    try {
      const updated = await this.prisma.transactions.update({
        where: {
          TransactionID: id,
          UserID: userId, // Ensure user owns the transaction
        },
        data: {
          ...(dto.amount !== undefined ? { Amount: dto.amount } : {}),
          ...(dto.type !== undefined ? { Type: dto.type } : {}),
          ...(dto.transactionDate !== undefined
            ? { TransactionDate: new Date(dto.transactionDate) }
            : {}),
          ...(dto.defaultCategory !== undefined
            ? { DefaultCategory: dto.defaultCategory }
            : {}),
          ...(dto.categoryId !== undefined
            ? { CategoryID: dto.categoryId }
            : {}),
          ...(dto.description !== undefined
            ? { Description: dto.description }
            : {}),
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

  async deleteForUser(userId: string, id: number) {
    try {
      await this.prisma.transactions.delete({
        where: {
          TransactionID: id,
          UserID: userId, // Ensure user owns the transaction
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
