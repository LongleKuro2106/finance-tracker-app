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
import DOMPurify from 'isomorphic-dompurify';

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
  categoryName?: string; // Category name (e.g., "Groceries", "Restaurants")

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Description must not exceed 500 characters',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string' && value) {
      return DOMPurify.sanitize(value);
    }
    return undefined;
  })
  description?: string;
}
