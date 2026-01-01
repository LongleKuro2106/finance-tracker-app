import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

/**
 * DTO for deleting own account.
 * Requires password confirmation for security.
 */
export class DeleteAccountDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(72, { message: 'Password must not exceed 72 characters' })
  password: string;
}
