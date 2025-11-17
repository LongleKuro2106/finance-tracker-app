import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { hash, compare } from 'bcrypt';
import type { User } from '@prisma/client';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async signup(input: SignupInput) {
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

    const created: User = await this.prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash: passwordHash,
        tokenVersion: 1,
      },
    });

    const token: string = this.signToken(
      created.id,
      created.username,
      created.tokenVersion,
    );
    return { user: created, access_token: token };
  }

  async login(input: LoginInput) {
    const user: User | null = await this.usersService.findUserByNameOrEmail(
      input.usernameOrEmail,
    );
    if (!user)
      throw new UnauthorizedException(
        'You have entered an invalid username or password',
      );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const valid: boolean = (await compare(
      input.password,
      user.passwordHash,
    )) as boolean;
    if (!valid)
      throw new UnauthorizedException(
        'You have entered an invalid username or password',
      );

    // Rotate token version on each successful login
    const updated: User = await this.prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: (user.tokenVersion ?? 1) + 1 },
    });

    const token: string = this.signToken(
      updated.id,
      updated.username,
      updated.tokenVersion,
    );
    return {
      accessToken: token,
      username: updated.username,
      userId: updated.id,
    };
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

  private signToken(
    userId: string,
    username: string,
    tokenVersion: number,
  ): string {
    const payload: JwtPayload = { sub: userId, username, tokenVersion };
    return this.jwt.sign(payload);
  }
}
