import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as jwt from 'jsonwebtoken';
import { hash, compare, genSalt } from 'bcrypt';
import type { User } from '@prisma/client';
import { AccountLockoutService } from '../common/services/account-lockout.service';
import {
  AuditLoggerService,
  AuditEventType,
  type AuditLogEntry,
} from '../common/services/audit-logger.service';
import { RefreshTokenService } from '../common/services/refresh-token.service';

interface SignupInput {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface LoginInput {
  usernameOrEmail: string;
  password: string;
}

type JwtPayload = {
  sub: string;
  username: string;
  tokenVersion: number;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
    private readonly accountLockoutService: AccountLockoutService,
    private readonly auditLogger: AuditLoggerService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async signup(input: SignupInput, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: input.username },
          ...(input.email ? [{ email: input.email }] : []),
        ],
      },
    });
    if (existing)
      throw new ConflictException('Username or email already exists');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const passwordHash: string = (await hash(input.password, 10)) as string;

    const created = await this.prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash: passwordHash,
        tokenVersion: 1,
      },
      // Return only safe, non-sensitive fields
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        tokenVersion: true,
      },
    });

    const accessToken: string = this.signToken(
      created.id,
      created.username,
      created.tokenVersion,
    );

    const refreshToken: string =
      await this.refreshTokenService.generateRefreshToken(
        created.id,
        created.username,
        created.tokenVersion,
      );

    // Log successful signup
    this.auditLogger.log({
      eventType: AuditEventType.SIGNUP,
      userId: created.id,
      username: created.username,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });

    // Return only safe user fields (exclude passwordHash and other sensitive data)
    return {
      user: {
        id: created.id,
        username: created.username,
        email: created.email,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async login(
    input: LoginInput,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    username: string;
    userId: string;
  }> {
    const user: User | null = await this.usersService.findUserByNameOrEmail(
      input.usernameOrEmail,
    );

    // Check if account is locked (even if user doesn't exist, to prevent enumeration)
    const isLocked = await this.accountLockoutService.isLocked(
      input.usernameOrEmail,
      user?.id,
    );

    if (isLocked) {
      this.auditLogger.logLoginFailure(
        input.usernameOrEmail,
        'Account locked due to too many failed attempts',
        ipAddress,
        userAgent,
      );
      throw new ThrottlerException(
        'Account temporarily locked due to too many failed login attempts. Please try again in 15 minutes.',
      );
    }

    // SECURITY: Timing attack prevention
    // Perform dummy password comparison for non-existent users to prevent timing attacks
    // This ensures consistent timing regardless of whether user exists
    // Generate dummy hash dynamically to match current bcrypt format
    const dummyHash = await this.generateDummyHash();

    // SECURITY: Always perform password comparison to maintain constant-time execution
    // This prevents attackers from determining user existence via timing differences
    let passwordComparisonPromise: Promise<boolean>;

    if (!user) {
      // Record failed attempt even if user doesn't exist (to prevent enumeration)
      await this.accountLockoutService.recordFailedAttempt(
        input.usernameOrEmail,
      );

      // SECURITY: Perform dummy password comparison to maintain consistent timing
      // This ensures the same execution time whether user exists or not
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      passwordComparisonPromise = compare(input.password, dummyHash) as Promise<boolean>;
    } else {
      // SECURITY: Perform actual password comparison
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      passwordComparisonPromise = compare(
        input.password,
        user.passwordHash,
      ) as Promise<boolean>;
    }

    // SECURITY: Wait for password comparison to complete before checking result
    // This ensures consistent timing regardless of code path
    const valid = await passwordComparisonPromise;

    if (!user) {
      // SECURITY: Throw generic error after password comparison completes
      // This maintains consistent timing and prevents user enumeration
      this.auditLogger.logLoginFailure(
        input.usernameOrEmail,
        'Invalid username or email',
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException(
        'You have entered an invalid username or password',
      );
    }

    // SECURITY: Continue with actual user validation
    // Note: valid is already checked above via passwordComparisonPromise
    if (!valid) {
      const lockoutResult =
        await this.accountLockoutService.recordFailedAttempt(
          input.usernameOrEmail,
          user.id,
        );

      this.auditLogger.logLoginFailure(
        input.usernameOrEmail,
        'Invalid password',
        ipAddress,
        userAgent,
      );

      // Check if account just got locked
      if (lockoutResult.isLocked) {
        this.auditLogger.logAccountLocked(
          user.id,
          user.username,
          ipAddress,
          userAgent,
        );
        throw new ThrottlerException(
          'Account temporarily locked due to too many failed login attempts. Please try again in 15 minutes.',
        );
      }

      // Use generic error message to prevent information disclosure
      throw new UnauthorizedException(
        'You have entered an invalid username or password',
      );
    }

    // Clear failed attempts on successful login
    await this.accountLockoutService.clearFailedAttempts(
      input.usernameOrEmail,
      user.id,
    );

    // Rotate token version on each successful login
    const updated: User = await this.prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: (user.tokenVersion ?? 1) + 1 },
    });

    const accessToken: string = this.signToken(
      updated.id,
      updated.username,
      updated.tokenVersion,
    );

    const refreshToken: string =
      await this.refreshTokenService.generateRefreshToken(
        updated.id,
        updated.username,
        updated.tokenVersion,
      );

    // Log successful login
    this.auditLogger.logLoginSuccess(
      updated.id,
      updated.username,
      ipAddress,
      userAgent,
    );

    return {
      accessToken,
      refreshToken,
      username: updated.username,
      userId: updated.id,
    };
  }

  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const tokenData =
      await this.refreshTokenService.validateRefreshToken(refreshToken);

    if (!tokenData) {
      this.auditLogger.logSuspiciousActivity(
        'INVALID_REFRESH_TOKEN',
        { ipAddress, userAgent },
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Get current user to check token version
    const user = await this.prisma.user.findUnique({
      where: { id: tokenData.userId },
    });

    if (!user || (user.tokenVersion ?? 1) !== tokenData.tokenVersion) {
      throw new UnauthorizedException('Token version mismatch');
    }

    // Extract token ID from refresh token for rotation
    // Token is already validated above, so we can safely decode
    // Use jwt.decode directly since refresh tokens use separate secret
    const decoded: unknown = jwt.decode(refreshToken);
    let tokenId: string | undefined;

    if (
      decoded &&
      typeof decoded === 'object' &&
      decoded !== null &&
      'tokenId' in decoded
    ) {
      const payload = decoded as Record<string, unknown>;
      if (typeof payload.tokenId === 'string') {
        tokenId = payload.tokenId;
      }
    }

    // Rotate refresh token (revoke old, issue new)
    const newRefreshToken = tokenId
      ? await this.refreshTokenService.rotateRefreshToken(
          tokenId,
          user.id,
          user.username,
          user.tokenVersion ?? 1,
        )
      : await this.refreshTokenService.generateRefreshToken(
          user.id,
          user.username,
          user.tokenVersion ?? 1,
        );

    // Generate new access token
    const newAccessToken = this.signToken(
      user.id,
      user.username,
      user.tokenVersion ?? 1,
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(
    userId: string,
    refreshToken?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    // Revoke all refresh tokens for this user
    await this.refreshTokenService.revokeAllUserTokens(userId);

    // Increment token version to invalidate all existing tokens
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });

    // Log logout
    this.auditLogger.log({
      eventType: AuditEventType.TOKEN_REVOKED,
      userId,
      ipAddress,
      userAgent,
      details: { reason: 'logout' },
      timestamp: new Date(),
    });
  }

  async getMe(userId: string) {
    const user: User | null = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return {
      username: user.username,
      userId: user.id,
      email: user.email,
    };
  }

  async updateProfile(
    userId: string,
    updateData: {
      password?: string;
      confirmPassword?: string;
      email?: string;
      oldPassword?: string;
    },
  ) {
    // Get current user to verify old password
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new UnauthorizedException('User not found');
    }

    // Verify old password if changing email or password
    if (updateData.email !== undefined || updateData.password !== undefined) {
      if (!updateData.oldPassword) {
        throw new UnauthorizedException(
          'Old password is required to update email or password',
        );
      }

      // Verify old password matches
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const isOldPasswordValid = (await compare(
        updateData.oldPassword,
        currentUser.passwordHash,
      )) as boolean;

      if (!isOldPasswordValid) {
        throw new UnauthorizedException('Old password is incorrect');
      }
    }

    // Verify password confirmation if changing password
    if (updateData.password !== undefined) {
      if (!updateData.confirmPassword) {
        throw new UnauthorizedException(
          'Password confirmation is required when changing password',
        );
      }

      if (updateData.password !== updateData.confirmPassword) {
        throw new ConflictException(
          'New password and confirmation do not match',
        );
      }
    }

    const updatePayload: {
      email?: string;
      passwordHash?: string;
    } = {};

    if (updateData.email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await this.usersService.findByEmail(
        updateData.email,
      );
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email already in use');
      }
      updatePayload.email = updateData.email;
    }

    if (updateData.password !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      updatePayload.passwordHash = (await hash(
        updateData.password,
        10,
      )) as string;
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new Error('No fields to update');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updatePayload,
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async deleteOwnAccount(
    userId: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Get current user to verify password
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new UnauthorizedException('User not found');
    }

    // Verify password before deletion
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const isPasswordValid = (await compare(
      password,
      currentUser.passwordHash,
    )) as boolean;

    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    // Log account deletion
    const auditEntry: AuditLogEntry = {
      eventType: AuditEventType.ACCOUNT_DELETED as AuditEventType,
      userId: currentUser.id,
      username: currentUser.username,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    };
    this.auditLogger.log(auditEntry);

    // Delete user and cascade will handle related records
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Generate a dummy bcrypt hash for timing attack prevention
   * Creates a valid bcrypt hash that will always fail comparison
   * Matches the format and timing characteristics of real bcrypt hashes
   */
  private async generateDummyHash(): Promise<string> {
    // Generate a salt with the same cost factor as real passwords (10 rounds)
    const salt = await genSalt(10);
    // Hash a dummy password to create a valid bcrypt hash format
    // This ensures the hash format matches current bcrypt standards
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return (await hash('dummy_password_for_timing_attack_prevention', salt)) as string;
  }

  private signToken(
    userId: string,
    username: string,
    tokenVersion: number,
  ): string {
    const payload: JwtPayload = { sub: userId, username, tokenVersion };
    return this.jwt.sign(payload);
  }
}
