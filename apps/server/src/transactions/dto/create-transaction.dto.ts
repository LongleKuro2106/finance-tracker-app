import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TransactionType } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';

export class CreateTransactionDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount!: number; // Decimal as number; Prisma will coerce

  @IsDateString()
  date!: string; // ISO string - date only (time will be normalized to 00:00:00Z)

  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Category name cannot exceed 100 characters' })
  @Transform(({ value }) => {
    // SECURITY: Sanitize category name to prevent XSS and injection attacks
    if (typeof value === 'string' && value) {
      return sanitizeHtml(value.trim(), {
        allowedTags: [],
        allowedAttributes: {},
      });
    }
    return value;
  })
  categoryName?: string; // Category name (e.g., "Groceries", "Restaurants")

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  @Transform(({ value }) => {
    if (typeof value === 'string' && value) {
      return sanitizeHtml(value, {
        allowedTags: [],
        allowedAttributes: {},
      });
    }
    return undefined;
  })
  description?: string;
}
