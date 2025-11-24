import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AccountLockoutService } from '../common/services/account-lockout.service';
import { AuditLoggerService } from '../common/services/audit-logger.service';
import { RefreshTokenService } from '../common/services/refresh-token.service';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        (() => {
          if (process.env.NODE_ENV === 'production') {
            throw new Error(
              'JWT_SECRET environment variable is required in production',
            );
          }
          return 'dev_jwt_secret';
        })(),
      signOptions: { expiresIn: '60m' },
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60_000, limit: 5 },
      { name: 'long', ttl: 3_600_000, limit: 20 },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    AccountLockoutService,
    AuditLoggerService,
    RefreshTokenService,
  ],
  exports: [AuthService, RefreshTokenService],
})
export class AuthModule {}
