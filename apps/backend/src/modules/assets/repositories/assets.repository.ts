// apps/backend/src/modules/assets/repositories/assets.repository.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateAssetDto,
  UpdateAssetDto,
  AssetFiltersDto,
} from '../domain/asset.dto';
import { randomUUID } from 'crypto';
import { IAssetAttachment } from '../domain';

// Helper for consistent includes across all methods
const assetInclude = {
  attachments: true,
} as const;

@Injectable()
export class AssetsRepository {
  private readonly logger = new Logger(AssetsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAssetDto, userId: string) {
    return this.prisma.asset.create({
      data: {
        ...dto,
        userId,
        available: dto.quantity, // Initially all available
      },
      include: assetInclude,
    });
  }

  async addAttachment(assetId: string, fileData: any) {
    return (await this.prisma.assetAttachment.create({
      data: {
        id: randomUUID(),
        ...fileData,
        assetId,
      },
    })) as IAssetAttachment;
  }

  async findAttachmentById(id: string) {
    return await this.prisma.assetAttachment.findUnique({
      where: { id },
    });
  }

  async deleteAttachment(id: string) {
    return await this.prisma.assetAttachment.delete({
      where: { id },
    });
  }

  async findAll(userId: string, filters?: AssetFiltersDto) {
    const where: Prisma.AssetWhereInput = {
      userId,
      ...(filters?.category && { category: filters.category }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.condition && { condition: filters.condition }),
      ...(filters?.availableOnly && { available: { gt: 0 } }),
      ...(filters?.query && {
        OR: [
          { name: { contains: filters.query, mode: 'insensitive' } },
          { description: { contains: filters.query, mode: 'insensitive' } },
          { sku: { contains: filters.query, mode: 'insensitive' } },
          { category: { contains: filters.query, mode: 'insensitive' } },
          { location: { contains: filters.query, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.asset.findMany({
      where,
      include: assetInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAvailable(userId: string, category?: string) {
    const where: Prisma.AssetWhereInput = {
      userId,
      available: { gt: 0 },
      status: 'AVAILABLE',
      ...(category && { category }),
    };

    return this.prisma.asset.findMany({
      where,
      include: assetInclude,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, userId: string) {
    return this.prisma.asset.findFirst({
      where: { id, userId },
      include: assetInclude,
    });
  }

  async update(id: string, dto: UpdateAssetDto) {
    return this.prisma.asset.update({
      where: { id },
      data: dto,
      include: assetInclude,
    });
  }

  async updateAvailability(id: string, available: number) {
    return this.prisma.asset.update({
      where: { id },
      data: { available },
      include: assetInclude,
    });
  }

  async delete(id: string) {
    return this.prisma.asset.delete({
      where: { id },
    });
  }
}
