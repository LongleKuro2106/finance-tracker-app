import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
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
  login(@Body(ValidationPipe) body: LoginDto) {
    return this.authService.login(body);
  }
}
