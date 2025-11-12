import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByName(categoryName: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        name: {
          equals: categoryName,
          mode: 'insensitive', // Case-insensitive search
        },
      },
    });

    if (!category) {
      throw new NotFoundException(
        `Category "${categoryName}" not found. Please use a valid category name.`,
      );
    }

    return category;
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      include: {
        parent: true,
        subcategories: true,
      },
    });
  }

  async findParentCategories() {
    return this.prisma.category.findMany({
      where: {
        parentId: null,
      },
      include: {
        subcategories: {
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
