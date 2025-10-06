import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'Username or email must be a string' })
  @IsNotEmpty({ message: 'Username or email is required' })
  @MinLength(1, {
    message: 'Username or email cannot be empty',
  })
  @MaxLength(100, {
    message: 'Username or email must not exceed 100 characters',
  })
  usernameOrEmail: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(1, { message: 'Password cannot be empty' })
  @MaxLength(72, { message: 'Password must not exceed 72 characters' })
  password: string;
}
