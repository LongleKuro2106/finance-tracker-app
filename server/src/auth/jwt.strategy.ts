import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { JwtFromRequestFunction } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const jwtFromRequest: JwtFromRequestFunction = (req: Request) => {
      const authHeader = req?.headers?.authorization;
      if (!authHeader) return null;
      const [scheme, token] = authHeader.split(' ');
      if (scheme !== 'Bearer' || !token) return null;
      return token;
    };

    const jwtSecret: string = (() => {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(
            'JWT_SECRET environment variable is required in production',
          );
        }
        return 'dev_jwt_secret'; // Only for development
      }
      return secret;
    })();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      jwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: {
    sub: string;
    username: string;
    tokenVersion: number;
  }): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) throw new UnauthorizedException();
    if ((user.tokenVersion ?? 1) !== payload.tokenVersion)
      throw new UnauthorizedException();
    return {
      userId: payload.sub,
      username: payload.username,
    };
  }
}
