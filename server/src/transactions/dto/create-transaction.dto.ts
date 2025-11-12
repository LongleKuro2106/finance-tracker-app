import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TransactionType } from '@prisma/client';

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
  description?: string;
}
