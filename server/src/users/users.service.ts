/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(role?: Role) {
    const users = await this.prisma.users.findMany({
      where: role ? { Role: role } : undefined,
      orderBy: { UserID: 'asc' },
    });
    if (role && users.length === 0) {
      throw new NotFoundException('No users with this role found');
    }
    return users;
  }

  async findOne(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { UserID: id },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByUsername(username: string) {
    return this.prisma.users.findFirst({ where: { Username: username } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.prisma.users.update({
        where: { UserID: id },
        data: {
          Username: updateUserDto.username,
          Password: updateUserDto.password,
          Email: updateUserDto.email,
          Role: updateUserDto.role,
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
      const removed = await this.prisma.users.delete({
        where: { UserID: id }
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