import { IsBoolean, IsNotEmpty } from 'class-validator';

export class PreserveBudgetDto {
  @IsBoolean()
  @IsNotEmpty()
  preserve!: boolean; // true to preserve budget to next month
}
