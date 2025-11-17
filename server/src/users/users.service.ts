import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { hash } from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return users;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByUsername(username: string) {
    return this.prisma.user.findFirst({ where: { username } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email } });
  }

  async findUserByNameOrEmail(usernameOrEmail: string) {
    // Check if input is email or username
    const isEmail = usernameOrEmail.includes('@');

    return this.prisma.user.findFirst({
      where: isEmail
        ? { email: usernameOrEmail }
        : { username: usernameOrEmail },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const updateData: {
        username?: string;
        email?: string;
        passwordHash?: string;
      } = {};

      if (updateUserDto.username !== undefined) {
        updateData.username = updateUserDto.username;
      }
      if (updateUserDto.email !== undefined) {
        updateData.email = updateUserDto.email;
      }
      if (updateUserDto.password !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        updateData.passwordHash = (await hash(
          updateUserDto.password,
          10,
        )) as string;
      }

      const user = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return user;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async delete(id: string) {
    try {
      const removed = await this.prisma.user.delete({
        where: { id },
      });
      return removed;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }
}
