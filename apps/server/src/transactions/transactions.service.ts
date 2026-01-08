import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CategoriesService } from '../categories/categories.service';
import type { QueryOptions } from '../common/utils/query-parser.util';
import {
  filtersToPrismaWhere,
  sortToPrismaOrderBy,
} from '../common/utils/query-parser.util';
import { isValidUUID } from '../common/utils/uuid-validator.util';

/**
 * Maximum timeout for database queries in milliseconds
 * Prevents DoS attacks via slow or hanging queries
 */
const QUERY_TIMEOUT_MS = 5000;

/**
 * Wraps a promise with a timeout to prevent hanging queries
 * Throws an error if the query exceeds the timeout duration
 */
async function queryWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = QUERY_TIMEOUT_MS,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout')), timeoutMs),
    ),
  ]);
}

// Helper function to format Decimal amounts to string with 2 decimal places
function formatAmount(amount: string | number | Decimal): string {
  const num =
    typeof amount === 'string'
      ? parseFloat(amount)
      : amount instanceof Decimal
        ? Number(amount)
        : amount;
  if (Number.isNaN(num)) {
    return '0.00';
  }
  return num.toFixed(2);
}

// Helper function to format transaction response
function formatTransactionResponse<
  T extends { amount: string | number | Decimal },
>(transaction: T): Omit<T, 'amount'> & { amount: string } {
  return {
    ...transaction,
    amount: formatAmount(transaction.amount),
  };
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async listUserTransactions(userId: string, opts: QueryOptions) {
    const where: Prisma.TransactionWhereInput = {
      userId: userId,
    };

    // Apply filters from query language
    if (opts.filters && opts.filters.length > 0) {
      Object.assign(where, filtersToPrismaWhere(opts.filters));
    }

    // Determine pagination method
    let take: number;
    let skip: number | undefined;
    let cursor: { id: string } | undefined;

    if (opts.pagination) {
      // Page-based pagination
      take = opts.pagination.size;
      skip = opts.pagination.skip;
    } else if (opts.cursor || opts.limit) {
      // Cursor-based pagination (backward compatibility)
      take = Math.max(1, Math.min(opts.limit ?? 20, 100)) + 1; // +1 to detect hasNext
      cursor = opts.cursor ? { id: opts.cursor } : undefined;
      skip = cursor ? 1 : undefined;
    } else {
      // Default pagination
      take = 21; // Default 20 + 1 for hasNext detection
      skip = undefined;
    }

    // Apply sorting
    const orderBy =
      opts.sort && opts.sort.length > 0
        ? (sortToPrismaOrderBy(opts.sort) as
            | Prisma.TransactionOrderByWithRelationInput
            | Prisma.TransactionOrderByWithRelationInput[])
        : ({ id: 'desc' } as Prisma.TransactionOrderByWithRelationInput);

    const queryPromise = this.prisma.transaction.findMany({
      where,
      orderBy,
      take,
      skip,
      ...(cursor ? { cursor } : {}),
      include: {
        category: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    let items;
    try {
      items = await queryWithTimeout(queryPromise, QUERY_TIMEOUT_MS);
    } catch (error) {
      if (error instanceof Error && error.message === 'Database query timeout') {
        throw new BadRequestException('Query timeout. Please try again with fewer filters.');
      }
      throw error;
    }

    // Handle pagination response
    if (opts.pagination) {
      // Page-based pagination response
      const hasNext = items.length > opts.pagination.size;
      const data = hasNext ? items.slice(0, opts.pagination.size) : items;

      return {
        data: data.map(formatTransactionResponse),
        pagination: {
          page: opts.pagination.page,
          size: opts.pagination.size,
          total: data.length, // Note: total count would require separate query
          hasNext,
        },
      };
    } else {
      // Cursor-based pagination response (backward compatibility)
      const pageSize = opts.limit ?? 20;
      const hasNext = items.length > pageSize;
      const data = hasNext ? items.slice(0, pageSize) : items;
      const nextCursor = hasNext ? String(data[data.length - 1]?.id) : null;

      return {
        data: data.map(formatTransactionResponse),
        nextCursor,
        pageSize,
      };
    }
  }

  async createForUser(userId: string, dto: CreateTransactionDto) {
    // Normalize date to start of day (00:00:00Z) for date-only storage
    const transactionDate = new Date(dto.date);
    transactionDate.setUTCHours(0, 0, 0, 0);

    // Resolve category name to ID
    // If no category provided, default to "Uncategorized" so transactions appear in charts
    let categoryNameToUse = dto.categoryName || 'Uncategorized';

    // SECURITY: Category name is already sanitized in DTO via Transform decorator
    // Additional validation here is defensive programming
    // Validate category name length (max 100 characters)
    if (categoryNameToUse.length > 100) {
      throw new BadRequestException(
        'Category name cannot exceed 100 characters',
      );
    }

    // Trim whitespace before query (defensive - should already be trimmed)
    categoryNameToUse = categoryNameToUse.trim();

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
    return formatTransactionResponse(created);
  }

  async updateForUser(userId: string, id: string, dto: UpdateTransactionDto) {
    // SECURITY: UUID validation is now handled at controller level via @IsUUID decorator
    // This ensures invalid UUIDs return 400 Bad Request instead of 404
    // Additional validation here is defensive programming
    if (!isValidUUID(id)) {
      throw new BadRequestException('Invalid transaction ID format');
    }

    try {
      // First verify the transaction exists and belongs to the user
      // SECURITY: Use generic error message to prevent information disclosure
      const existing = await this.prisma.transaction.findFirst({
        where: {
          id: id,
          userId: userId,
        },
      });

      if (!existing) {
        throw new NotFoundException('Resource not found');
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
          // SECURITY: Category name is already sanitized in DTO via Transform decorator
          // Additional validation here is defensive programming
          // Validate category name length (max 100 characters)
          if (dto.categoryName.length > 100) {
            throw new BadRequestException(
              'Category name cannot exceed 100 characters',
            );
          }

          // Trim whitespace before query (defensive - should already be trimmed and sanitized)
          const trimmedCategoryName = dto.categoryName.trim();
          const category =
            await this.categoriesService.findByName(trimmedCategoryName);
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
      return formatTransactionResponse(updated);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'P2025' ||
          error.code === 'P2023' ||
          (error.code === 'P2003' && 'meta' in error))
      ) {
        // SECURITY: Use generic error message to prevent information disclosure
        throw new NotFoundException('Resource not found');
      }
      // If it's already a NotFoundException, rethrow it
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }

  async deleteForUser(userId: string, id: string) {
    // SECURITY: UUID validation is now handled at controller level via @IsUUID decorator
    if (!isValidUUID(id)) {
      throw new BadRequestException('Invalid transaction ID format');
    }

    try {
      // First verify the transaction exists and belongs to the user
      // SECURITY: Use generic error message to prevent information disclosure
      const existing = await this.prisma.transaction.findFirst({
        where: {
          id: id,
          userId: userId,
        },
      });

      if (!existing) {
        throw new NotFoundException('Resource not found');
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
        (error.code === 'P2025' ||
          error.code === 'P2023' ||
          (error.code === 'P2003' && 'meta' in error))
      ) {
        // SECURITY: Use generic error message to prevent information disclosure
        throw new NotFoundException('Resource not found');
      }
      // If it's already a NotFoundException, rethrow it
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }
}
