import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { hash, compare } from 'bcrypt';
import type { Users, Role } from '@prisma/client';

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
  role: Role;
  tokenVersion: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(input: SignupInput) {
    const existing = await this.prisma.users.findFirst({
      where: {
        OR: [
          { Username: input.username },
          ...(input.email ? [{ Email: input.email }] : []),
        ],
      },
    });
    if (existing)
      throw new ConflictException('Username or email already exists');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const passwordHash: string = (await hash(input.password, 10)) as string;

    const created: Users = await this.prisma.users.create({
      data: {
        Username: input.username,
        Email: input.email,
        Password: passwordHash,
        Role: 'user', // Always default to 'user' role for new sign ups
        TokenVersion: 1,
      },
    });

    const token: string = this.signToken(
      created.UserID,
      created.Username,
      created.Role,
      created.TokenVersion,
    );
    return { user: created, access_token: token };
  }

  async login(input: LoginInput) {
    // Check if input is email or username
    const isEmail = input.usernameOrEmail.includes('@');

    const user: Users | null = await this.prisma.users.findFirst({
      where: isEmail
        ? { Email: input.usernameOrEmail }
        : { Username: input.usernameOrEmail },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const valid: boolean = (await compare(
      input.password,
      user.Password,
    )) as boolean;
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Rotate token version on each successful login
    const updated: Users = await this.prisma.users.update({
      where: { UserID: user.UserID },
      data: { TokenVersion: (user.TokenVersion ?? 1) + 1 },
    });

    const token: string = this.signToken(
      updated.UserID,
      updated.Username,
      updated.Role,
      updated.TokenVersion,
    );
    return { user, access_token: token };
  }

  private signToken(
    userId: string,
    username: string,
    role: Role,
    tokenVersion: number,
  ): string {
    const payload: JwtPayload = { sub: userId, username, role, tokenVersion };
    return this.jwt.sign(payload);
  }
}
