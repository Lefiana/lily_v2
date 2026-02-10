// apps/backend/src/modules/asset-checkouts/repositories/asset-checkouts.repository.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCheckoutDto, CheckoutFiltersDto } from '../domain/checkout.dto';

const checkoutInclude = {
  items: {
    include: {
      asset: {
        include: {
          attachments: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class AssetCheckoutsRepository {
  private readonly logger = new Logger(AssetCheckoutsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateCheckoutDto & {
      userId: string;
      checkedOutBy: string;
      status: 'BORROWED' | 'RETURNED' | 'OVERDUE' | 'DAMAGED' | 'LOST';
    },
  ) {
    const { items, ...checkoutData } = dto;

    return this.prisma.assetCheckout.create({
      data: {
        ...checkoutData,
        items: {
          create: items.map((item) => ({
            quantity: item.quantity,
            notes: item.notes,
            asset: {
              connect: { id: item.assetId },
            },
          })),
        },
      },
      include: checkoutInclude,
    });
  }

  async findAll(userId: string, filters?: CheckoutFiltersDto) {
    const where: Prisma.AssetCheckoutWhereInput = {
      userId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.borrowerId && { borrowerId: filters.borrowerId }),
      ...(filters?.assetId && {
        items: {
          some: {
            assetId: filters.assetId,
          },
        },
      }),
      ...(filters?.overdueOnly && {
        status: 'BORROWED',
        dueDate: {
          lt: new Date(),
        },
      }),
      ...(filters?.fromDate && {
        borrowedAt: {
          gte: filters.fromDate,
        },
      }),
      ...(filters?.toDate && {
        borrowedAt: {
          lte: filters.toDate,
        },
      }),
    };

    return this.prisma.assetCheckout.findMany({
      where,
      include: checkoutInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(userId: string, borrowerId?: string) {
    const where: Prisma.AssetCheckoutWhereInput = {
      userId,
      status: 'BORROWED',
      ...(borrowerId && { borrowerId }),
    };

    return this.prisma.assetCheckout.findMany({
      where,
      include: checkoutInclude,
      orderBy: { dueDate: 'asc' },
    });
  }

  async findOverdue(userId: string) {
    return this.prisma.assetCheckout.findMany({
      where: {
        userId,
        status: 'BORROWED',
        dueDate: {
          lt: new Date(),
        },
      },
      include: checkoutInclude,
      orderBy: { dueDate: 'asc' },
    });
  }

  async findById(id: string, userId: string) {
    return this.prisma.assetCheckout.findFirst({
      where: { id, userId },
      include: checkoutInclude,
    });
  }

  async update(id: string, data: Prisma.AssetCheckoutUpdateInput) {
    return this.prisma.assetCheckout.update({
      where: { id },
      data,
      include: checkoutInclude,
    });
  }

  async delete(id: string) {
    return this.prisma.assetCheckout.delete({
      where: { id },
    });
  }
}
