import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  password: string;

  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsEnum(Role, {
    message: 'valid role required',
  })
  role: Role;
}
