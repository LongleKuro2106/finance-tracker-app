import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO for updating own profile.
 * Users can only update their password and email, not username.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;
}
