import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (user.role !== Role.administrator) {
      throw new ForbiddenException(
        'Access denied. Administrator role required.',
      );
    }

    return true;
  }
}
