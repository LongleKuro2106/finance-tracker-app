import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body(ValidationPipe) body: SignupDto) {
    return this.authService.signup(body);
  }

  @Post('login')
  @Throttle({
    default: { limit: 3, ttl: 60_000 },
    short: { limit: 3, ttl: 60_000 },
    long: { limit: 10, ttl: 3_600_000 },
  })
  login(@Body(ValidationPipe) body: LoginDto) {
    return this.authService.login(body);
  }
}
