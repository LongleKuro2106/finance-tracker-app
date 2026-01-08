import {
  Body,
  Controller,
  Delete,
  Get,
  Put,
  Post,
  UseGuards,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DevThrottlerGuard } from '../common/guards/dev-throttler.guard';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import * as authenticatedUserInterface from '../common/types/authenticated-user.interface';
import type { Request } from 'express';
import { RATE_LIMITS } from '../common/config/rate-limit.config';

@Controller('v1/users')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @UseGuards(DevThrottlerGuard)
  @Throttle(RATE_LIMITS.auth)
  signup(@Body(ValidationPipe) body: SignupDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.signup(body, ipAddress, userAgent);
  }

  @Post('login')
  @UseGuards(DevThrottlerGuard)
  @Throttle(RATE_LIMITS.auth)
  login(@Body(ValidationPipe) body: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(body, ipAddress, userAgent);
  }

  @Post('refresh')
  @UseGuards(DevThrottlerGuard)
  @Throttle(RATE_LIMITS.refresh)
  refresh(@Body(ValidationPipe) body: RefreshTokenDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.refreshTokens(
      body.refreshToken,
      ipAddress,
      userAgent,
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @CurrentUser() user: authenticatedUserInterface.AuthenticatedUser,
    @Body() body: { refreshToken?: string },
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.logout(
      user.userId,
      body.refreshToken,
      ipAddress,
      userAgent,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: authenticatedUserInterface.AuthenticatedUser) {
    return this.authService.getMe(user.userId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard, DevThrottlerGuard)
  @Throttle(RATE_LIMITS.auth)
  updateProfile(
    @CurrentUser() user: authenticatedUserInterface.AuthenticatedUser,
    @Body(ValidationPipe) updateProfileDto: UpdateProfileDto,
  ) {
    // SECURITY: Rate limiting prevents brute force attacks on password updates
    return this.authService.updateProfile(user.userId, updateProfileDto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  deleteOwnAccount(
    @CurrentUser() user: authenticatedUserInterface.AuthenticatedUser,
    @Body(ValidationPipe) deleteAccountDto: DeleteAccountDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.deleteOwnAccount(
      user.userId,
      deleteAccountDto.password,
      ipAddress,
      userAgent,
    );
  }
}
