import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for budget month/year query parameters
 * Validates month (1-12) and year (2000-2100) ranges
 */
export class BudgetMonthYearQueryDto {
  @IsInt({ message: 'Month must be a valid integer' })
  @Min(1, { message: 'Month must be between 1 and 12' })
  @Max(12, { message: 'Month must be between 1 and 12' })
  @Type(() => Number)
  month: number;

  @IsInt({ message: 'Year must be a valid integer' })
  @Min(2000, { message: 'Year must be between 2000 and 2100' })
  @Max(2100, { message: 'Year must be between 2000 and 2100' })
  @Type(() => Number)
  year: number;
}
