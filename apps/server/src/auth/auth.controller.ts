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
import { RequestId } from '../common/decorators/request-id.decorator';
import * as authenticatedUserInterface from '../common/types/authenticated-user.interface';
import type { Request } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

@Controller('v1/users')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @UseGuards(DevThrottlerGuard)
  @Throttle({
    default: {
      // Use reduced limits in development instead of disabling
      limit: isProduction ? 5 : 50, // 10x production limit in dev
      ttl: 60_000,
    },
  })
  signup(
    @Body(ValidationPipe) body: SignupDto,
    @Req() req: Request,
    @RequestId() requestId?: string,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.signup(body, ipAddress, userAgent, requestId);
  }

  @Post('login')
  @UseGuards(DevThrottlerGuard)
  @Throttle({
    default: {
      // Use reduced limits in development instead of disabling
      limit: isProduction ? 5 : 50, // 10x production limit in dev
      ttl: 60_000,
    },
  }) // IP-based rate limiting (reduced limits in dev)
  login(
    @Body(ValidationPipe) body: LoginDto,
    @Req() req: Request,
    @RequestId() requestId?: string,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(body, ipAddress, userAgent, requestId);
  }

  @Post('refresh')
  @UseGuards(DevThrottlerGuard)
  @Throttle({
    default: {
      // Use reduced limits in development instead of disabling
      limit: isProduction ? 10 : 100, // 10x production limit in dev
      ttl: 60_000,
    },
  })
  refresh(
    @Body(ValidationPipe) body: RefreshTokenDto,
    @Req() req: Request,
    @RequestId() requestId?: string,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.refreshTokens(
      body.refreshToken,
      ipAddress,
      userAgent,
      requestId,
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @CurrentUser() user: authenticatedUserInterface.AuthenticatedUser,
    @Body() body: { refreshToken?: string },
    @Req() req: Request,
    @RequestId() requestId?: string,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.logout(
      user.userId,
      body.refreshToken,
      ipAddress,
      userAgent,
      requestId,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: authenticatedUserInterface.AuthenticatedUser) {
    return this.authService.getMe(user.userId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser() user: authenticatedUserInterface.AuthenticatedUser,
    @Body(ValidationPipe) updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.userId, updateProfileDto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  deleteOwnAccount(
    @CurrentUser() user: authenticatedUserInterface.AuthenticatedUser,
    @Body(ValidationPipe) deleteAccountDto: DeleteAccountDto,
    @Req() req: Request,
    @RequestId() requestId?: string,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.deleteOwnAccount(
      user.userId,
      deleteAccountDto.password,
      ipAddress,
      userAgent,
      requestId,
    );
  }
}
