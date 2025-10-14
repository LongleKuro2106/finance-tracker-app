import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsPositive,
  IsIn,
} from 'class-validator';
import { DefaultCategory } from '@prisma/client';

export class CreateTransactionDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount!: number; // Decimal as number; Prisma will coerce

  @IsDateString()
  transactionDate!: string; // ISO string

  @IsOptional()
  @IsIn(Object.values(DefaultCategory))
  defaultCategory?: DefaultCategory;

  @IsOptional()
  @IsInt()
  @IsPositive()
  categoryId?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  type!: 'expense' | 'income';
}
