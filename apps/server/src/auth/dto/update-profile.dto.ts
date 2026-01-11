import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * DTO for updating own profile.
 * Users can only update their password and email, not username.
 * Requires old password when changing email or password.
 * Requires confirm password when changing password.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(72, { message: 'Password must not exceed 72 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password?: string;

  @ValidateIf((o: UpdateProfileDto) => o.password !== undefined)
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  confirmPassword?: string;

  // Old password is required if changing email or password
  @ValidateIf(
    (o: UpdateProfileDto) => o.email !== undefined || o.password !== undefined,
  )
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  oldPassword?: string;
}
