import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for validating month and year query/path parameters
 * Used in budget endpoints to ensure valid date ranges
 */
export class BudgetQueryDto {
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month!: number; // 1-12

  @IsInt()
  @IsNotEmpty()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  year!: number; // 2000-2100
}
