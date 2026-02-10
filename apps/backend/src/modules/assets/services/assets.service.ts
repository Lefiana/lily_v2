// apps/backend/src/modules/assets/services/assets.service.ts

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { AssetsRepository } from '../repositories/assets.repository';
import { AssetsGateway } from '../gateways/assets.gateway';
import {
  CreateAssetDto,
  UpdateAssetDto,
  AssetFiltersDto,
} from '../domain/asset.dto';
import { AssetEvents, AssetStatus } from '../domain/asset.types';
import { PrismaService } from '@core/prisma/prisma.service';
import * as fs from 'fs/promises';
import { join } from 'path';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private readonly repo: AssetsRepository,
    private readonly gateway: AssetsGateway,
    private readonly prisma: PrismaService,
  ) {}

  private handleError(error: unknown, context: string): never {
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`${context}: ${message}`);
    throw new InternalServerErrorException(context);
  }

  async create(dto: CreateAssetDto, userId: string) {
    try {
      const asset = await this.repo.create(dto, userId);
      this.gateway.emitToUser(userId, AssetEvents.ASSET_CREATED, asset);
      return asset;
    } catch (error) {
      this.handleError(error, 'Error creating asset');
    }
  }

  async uploadFile(assetId: string, userId: string, file: Express.Multer.File) {
    try {
      // Ownership check
      await this.findOne(assetId, userId);

      const attachment = await this.repo.addAttachment(assetId, {
        filename: file.originalname,
        filepath: `/uploads/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size,
      });

      this.gateway.emitToUser(userId, 'attachment_added', {
        assetId,
        attachment,
      });

      return attachment;
    } catch (error) {
      this.handleError(error, 'File upload failed');
    }
  }

  async removeAttachment(attachmentId: string, userId: string) {
    try {
      const attachment = await this.repo.findAttachmentById(attachmentId);
      if (!attachment) throw new NotFoundException('Attachment not found');

      const asset = await this.repo.findById(attachment.assetId, userId);
      if (!asset)
        throw new NotFoundException('Unauthorized or asset not found');

      await this.repo.deleteAttachment(attachmentId);

      const fileName = attachment.filepath.replace('/uploads/', '');
      const fullPath = join(process.cwd(), 'uploads', fileName);

      try {
        await fs.unlink(fullPath);
        this.logger.log(`Deleted file: ${fullPath}`);
      } catch (fileErr) {
        this.logger.warn(
          `File not found on disk, but DB record deleted: ${fullPath}`,
        );
      }

      this.gateway.emitToUser(userId, 'attachment_deleted', {
        assetId: attachment.assetId,
        attachmentId: attachment.id,
      });

      return { success: true };
    } catch (error) {
      this.handleError(error, 'Could not delete attachment');
    }
  }

  async findAll(userId: string, filters?: AssetFiltersDto) {
    try {
      return await this.repo.findAll(userId, filters);
    } catch (error) {
      this.handleError(error, 'Error fetching assets');
    }
  }

  async findAvailable(userId: string, category?: string) {
    try {
      return await this.repo.findAvailable(userId, category);
    } catch (error) {
      this.handleError(error, 'Error fetching available assets');
    }
  }

  async search(userId: string, query: string, category?: string) {
    try {
      return await this.repo.findAll(userId, { query, category });
    } catch (error) {
      this.handleError(error, 'Error searching assets');
    }
  }

  async findOne(id: string, userId: string) {
    try {
      const asset = await this.repo.findById(id, userId);
      if (!asset) throw new NotFoundException(`Asset with ID ${id} not found`);
      return asset;
    } catch (error) {
      this.handleError(error, 'Error retrieving asset');
    }
  }

  async update(id: string, dto: UpdateAssetDto, userId: string) {
    try {
      const current = await this.findOne(id, userId);

      // Calculate new availability if quantity changed
      let newAvailable = current.available;
      if (dto.quantity !== undefined && dto.quantity !== current.quantity) {
        const checkedOut = current.quantity - current.available;
        newAvailable = Math.max(0, dto.quantity - checkedOut);
      }

      const updated = await this.repo.update(id, {
        ...dto,
        available: newAvailable,
      });

      this.gateway.emitToUser(userId, AssetEvents.ASSET_UPDATED, updated);
      return updated;
    } catch (error) {
      this.handleError(error, 'Could not update asset');
    }
  }

  async remove(id: string, userId: string) {
    try {
      await this.findOne(id, userId);

      // Check if asset has any checkout history
      const checkoutItemsCount = await this.prisma.assetCheckoutItem.count({
        where: { assetId: id },
      });

      if (checkoutItemsCount > 0) {
        throw new BadRequestException(
          'Cannot delete asset with checkout history. Consider changing its status to DECOMMISSIONED instead.',
        );
      }

      await this.repo.delete(id);

      this.gateway.emitToUser(userId, AssetEvents.ASSET_DELETED, { id });
      return { success: true };
    } catch (error) {
      this.handleError(error, 'Could not delete asset');
    }
  }

  async checkAvailability(
    assetId: string,
    requestedQty: number,
    userId: string,
  ): Promise<boolean> {
    const asset = await this.repo.findById(assetId, userId);
    if (!asset) throw new NotFoundException('Asset not found');

    return (
      asset.available >= requestedQty && asset.status === AssetStatus.AVAILABLE
    );
  }

  async reserveAssets(
    checkoutItems: { assetId: string; quantity: number }[],
    userId: string,
  ): Promise<void> {
    for (const item of checkoutItems) {
      const asset = await this.repo.findById(item.assetId, userId);
      if (!asset)
        throw new NotFoundException(`Asset ${item.assetId} not found`);

      if (asset.available < item.quantity) {
        throw new BadRequestException(
          `Insufficient quantity for ${asset.name}. Available: ${asset.available}, Requested: ${item.quantity}`,
        );
      }

      await this.repo.updateAvailability(
        item.assetId,
        asset.available - item.quantity,
      );
    }
  }

  async releaseAssets(
    checkoutItems: { assetId: string; quantity: number }[],
    userId: string,
  ): Promise<void> {
    for (const item of checkoutItems) {
      const asset = await this.repo.findById(item.assetId, userId);
      if (!asset) continue;

      const newAvailable = Math.min(
        asset.quantity,
        asset.available + item.quantity,
      );
      await this.repo.updateAvailability(item.assetId, newAvailable);

      this.gateway.emitToUser(userId, AssetEvents.ASSET_AVAILABILITY_CHANGED, {
        assetId: item.assetId,
        available: newAvailable,
        total: asset.quantity,
      });
    }
  }
}
