import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
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
  @MinLength(8)
  @MaxLength(72)
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
