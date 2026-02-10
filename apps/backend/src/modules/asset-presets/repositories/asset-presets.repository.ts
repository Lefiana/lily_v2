// apps/backend/src/modules/asset-presets/repositories/asset-presets.repository.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { CreatePresetDto, UpdatePresetDto } from '../domain/preset.dto';

const presetInclude = {
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
export class AssetPresetsRepository {
  private readonly logger = new Logger(AssetPresetsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePresetDto, userId: string) {
    const { items, ...presetData } = dto;

    return this.prisma.assetPreset.create({
      data: {
        ...presetData,
        userId,
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
      include: presetInclude,
    });
  }

  async findAll(userId: string, includeInactive: boolean = false) {
    return this.prisma.assetPreset.findMany({
      where: {
        userId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: presetInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    return this.prisma.assetPreset.findFirst({
      where: { id, userId },
      include: presetInclude,
    });
  }

  async update(id: string, dto: UpdatePresetDto, userId: string) {
    const { items, ...presetData } = dto;

    // If items are provided, we need to handle the update differently
    if (items) {
      // First, delete existing items
      await this.prisma.assetPresetItem.deleteMany({
        where: { presetId: id },
      });

      // Then update preset and create new items
      return this.prisma.assetPreset.update({
        where: { id },
        data: {
          ...presetData,
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
        include: presetInclude,
      });
    }

    // Simple update without items
    return this.prisma.assetPreset.update({
      where: { id },
      data: presetData,
      include: presetInclude,
    });
  }

  async delete(id: string) {
    return this.prisma.assetPreset.delete({
      where: { id },
    });
  }
}
