import { IsOptional, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * DTO for date range queries with validation
 */
export class DateRangeDto {
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => {
    if (typeof value === 'string' && value) {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  })
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => {
    if (typeof value === 'string' && value) {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  })
  endDate?: Date;
}

/**
 * DTO for overview analytics query
 */
export class OverviewQueryDto extends DateRangeDto {}

/**
 * DTO for monthly analytics query
 */
export class MonthlyQueryDto extends DateRangeDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  @Type(() => Number)
  months?: number;
}

/**
 * DTO for categories analytics query
 */
export class CategoriesQueryDto extends DateRangeDto {}

/**
 * DTO for daily spending analytics query
 */
export class DailySpendingQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(2100)
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month?: number;
}
