import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
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
      secret: (() => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error(
            'JWT_SECRET environment variable is required. Please set it in your .env file.',
            );
          }
        return secret;
        })(),
      signOptions: { expiresIn: '60m' },
    }),
    // ThrottlerModule is configured globally in AppModule
    // No need to import it here to avoid conflicts
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
