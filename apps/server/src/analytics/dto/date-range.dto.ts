import { IsOptional, IsDateString } from 'class-validator';

/**
 * DTO for validating date range query parameters
 * Used in analytics endpoints to ensure valid ISO 8601 date strings
 * @IsDateString() validates ISO 8601 format by default
 */
export class DateRangeDto {
  @IsOptional()
  @IsDateString()
  startDate?: string; // ISO 8601 date string

  @IsOptional()
  @IsDateString()
  endDate?: string; // ISO 8601 date string
}
