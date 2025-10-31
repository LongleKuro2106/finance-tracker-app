import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../types/authenticated-user.interface';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role !== Role.administrator) {
      throw new ForbiddenException(
        'Access denied. Administrator role required.',
      );
    }

    return true;
  }
}
