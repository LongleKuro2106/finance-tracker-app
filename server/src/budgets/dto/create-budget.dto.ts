import { IsInt, IsNotEmpty, IsNumber, Max, Min } from 'class-validator';

export class CreateBudgetDto {
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(12)
  month!: number; // 1-12

  @IsInt()
  @IsNotEmpty()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount!: number; // Decimal as number; Prisma will coerce
}
