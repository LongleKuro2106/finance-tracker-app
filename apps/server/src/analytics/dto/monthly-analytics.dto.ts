import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { DateRangeDto } from './date-range.dto';

/**
 * DTO for monthly analytics endpoint
 * Extends DateRangeDto and adds months parameter validation
 * SECURITY FIX: Added pagination parameters
 */
export class MonthlyAnalyticsDto extends DateRangeDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  months?: number; // 1-12 months

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  limit?: number; // Pagination limit (default: 100, max: 1000)

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number; // Pagination offset (default: 0)
}
