import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  userId: string;
  username: string;
  role: Role;
}
