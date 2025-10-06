import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { JwtFromRequestFunction } from 'passport-jwt';
import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const jwtFromRequest: JwtFromRequestFunction = (req: Request) => {
      const authHeader = req?.headers?.authorization;
      if (!authHeader) return null;
      const [scheme, token] = authHeader.split(' ');
      if (scheme !== 'Bearer' || !token) return null;
      return token;
    };

    const jwtSecret: string = String(
      process.env.JWT_SECRET || 'dev_jwt_secret',
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      jwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  validate(payload: { sub: string; username: string; role: string }) {
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
