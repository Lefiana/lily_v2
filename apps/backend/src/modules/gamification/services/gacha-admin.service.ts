// apps/backend/src/modules/gamification/services/gacha-admin.service.ts

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { GachaPool, RarityTier, GachaPoolType } from '@prisma/client';
import {
  AssetProviderRegistry,
  AssetSource,
} from '../providers/asset-provider.registry';
import { CloudinaryAssetProvider } from '../providers/cloudinary-asset.provider';
import { LocalAssetProvider } from '../providers/local-asset.provider';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class GachaAdminService {
  private readonly logger = new Logger(GachaAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: AssetProviderRegistry,
    private readonly cloudinaryProvider: CloudinaryAssetProvider,
    private readonly localProvider: LocalAssetProvider,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // Pool Management
  // ═══════════════════════════════════════════════════════════════

  async createPool(data: {
    name: string;
    description?: string;
    type: 'STANDARD' | 'PREMIUM';
    cost: number;
    isAdminOnly?: boolean;
    wallhavenTags?: string;
    sourcePriority?: string[];
  }): Promise<GachaPool> {
    // Validate source priority
    const priority = data.sourcePriority || [
      'local',
      'cloudinary',
      'wallhaven',
    ];

    const pool = await this.prisma.gachaPool.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type as GachaPoolType,
        cost: data.cost,
        isAdminOnly: data.isAdminOnly ?? false,
        wallhavenTags: data.wallhavenTags,
        sourcePriority: priority as any,
        enableLocal: priority.includes('local'),
        enableCloudinary: priority.includes('cloudinary'),
        enableWallhaven: priority.includes('wallhaven'),
      },
    });

    // Create default rarity configs
    await this.createDefaultRarityConfigs(pool.id);

    this.logger.log(`Created gacha pool: ${pool.id} - ${pool.name}`);
    return pool;
  }

  async getAllPools(): Promise<GachaPool[]> {
    return this.prisma.gachaPool.findMany({
      include: {
        _count: { select: { items: true, cloudinaryAssets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPoolDetails(poolId: string) {
    const pool = await this.prisma.gachaPool.findUnique({
      where: { id: poolId },
      include: {
        poolRarityConfigs: { orderBy: { rarity: 'asc' } },
        _count: {
          select: { items: true, cloudinaryAssets: true, gachaPulls: true },
        },
      },
    });

    if (!pool) throw new NotFoundException('Pool not found');

    return pool;
  }

  async updatePool(poolId: string, data: any): Promise<GachaPool> {
    const updateData: any = { ...data };

    if (data.sourcePriority) {
      updateData.sourcePriority = data.sourcePriority as any;
      updateData.enableLocal = data.sourcePriority.includes('local');
      updateData.enableCloudinary = data.sourcePriority.includes('cloudinary');
      updateData.enableWallhaven = data.sourcePriority.includes('wallhaven');
      delete updateData.sourcePriority;
    }

    return this.prisma.gachaPool.update({
      where: { id: poolId },
      data: updateData,
    });
  }

  async deletePool(poolId: string): Promise<void> {
    // Delete associated Cloudinary assets
    const cloudinaryAssets = await this.prisma.cloudinaryAsset.findMany({
      where: { poolId },
    });

    for (const asset of cloudinaryAssets) {
      try {
        await this.cloudinaryProvider.deleteImage(asset.publicId);
      } catch (error) {
        this.logger.warn(
          `Failed to delete Cloudinary asset ${asset.publicId}:`,
          error,
        );
      }
    }

    // Pool deletion will cascade to related records via Prisma relations
    await this.prisma.gachaPool.delete({ where: { id: poolId } });
    this.logger.log(`Deleted gacha pool: ${poolId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // Rarity Configuration
  // ═══════════════════════════════════════════════════════════════

  async getRarityConfig(poolId: string) {
    const configs = await this.prisma.poolRarityConfig.findMany({
      where: { poolId },
      orderBy: { rarity: 'asc' },
    });

    // Calculate probabilities
    const totalWeight = configs.reduce((sum, c) => sum + c.weight, 0);

    return configs.map((config) => ({
      ...config,
      probability: config.weight / totalWeight,
      percentage: ((config.weight / totalWeight) * 100).toFixed(2) + '%',
    }));
  }

  async updateRarityConfig(
    poolId: string,
    configs: Array<{ rarity: RarityTier; weight: number }>,
  ) {
    // Validate all rarities are provided
    const allRarities = Object.values(RarityTier);
    const providedRarities = configs.map((c) => c.rarity);

    if (providedRarities.length !== allRarities.length) {
      throw new BadRequestException(
        `Must provide weights for all ${allRarities.length} rarities`,
      );
    }

    // Validate weights are positive
    if (configs.some((c) => c.weight <= 0)) {
      throw new BadRequestException('All weights must be positive integers');
    }

    // Calculate probabilities
    const totalWeight = configs.reduce((sum, c) => sum + c.weight, 0);

    // Upsert configs
    await this.prisma.$transaction(
      configs.map((config) =>
        this.prisma.poolRarityConfig.upsert({
          where: {
            poolId_rarity: { poolId, rarity: config.rarity },
          },
          update: {
            weight: config.weight,
            probability: config.weight / totalWeight,
          },
          create: {
            poolId,
            rarity: config.rarity,
            weight: config.weight,
            probability: config.weight / totalWeight,
          },
        }),
      ),
    );

    this.logger.log(`Updated rarity config for pool ${poolId}`);
    return this.getRarityConfig(poolId);
  }

  private async createDefaultRarityConfigs(poolId: string) {
    const defaultWeights = [
      { rarity: RarityTier.COMMON, weight: 60 },
      { rarity: RarityTier.UNCOMMON, weight: 25 },
      { rarity: RarityTier.RARE, weight: 10 },
      { rarity: RarityTier.EPIC, weight: 4 },
      { rarity: RarityTier.LEGENDARY, weight: 1 },
    ];

    const totalWeight = defaultWeights.reduce((sum, w) => sum + w.weight, 0);

    await this.prisma.poolRarityConfig.createMany({
      data: defaultWeights.map((w) => ({
        poolId,
        rarity: w.rarity,
        weight: w.weight,
        probability: w.weight / totalWeight,
      })),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Cloudinary Asset Management
  // ═══════════════════════════════════════════════════════════════

  async addCloudinaryAssetByUrl(
    poolId: string,
    data: {
      publicId: string;
      name: string;
      rarity: RarityTier;
      weight?: number;
      tags?: string[];
    },
    adminId: string,
  ) {
    // Validate pool exists
    const pool = await this.prisma.gachaPool.findUnique({
      where: { id: poolId },
    });
    if (!pool) throw new NotFoundException('Pool not found');

    // Get image details from Cloudinary
    let assetDetails;
    try {
      assetDetails = await this.cloudinaryProvider.getImageDetails(
        data.publicId,
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch image details from Cloudinary`,
      );
    }

    // Create record
    const asset = await this.prisma.cloudinaryAsset.create({
      data: {
        publicId: data.publicId,
        secureUrl: assetDetails.secureUrl,
        poolId,
        name: data.name,
        rarity: data.rarity,
        weight: data.weight ?? 1,
        uploadedBy: adminId,
        tags: data.tags || [],
      },
    });

    // Update Cloudinary metadata
    await this.cloudinaryProvider.updateMetadata(data.publicId, {
      name: data.name,
      rarity: data.rarity,
      weight: data.weight ?? 1,
    });

    this.logger.log(
      `Added Cloudinary asset ${data.publicId} to pool ${poolId}`,
    );
    return asset;
  }

  async uploadCloudinaryAsset(
    poolId: string,
    file: Express.Multer.File,
    metadata: {
      name?: string;
      rarity?: RarityTier;
      weight?: number;
      tags?: string[];
    },
    adminId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate image
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: JPG, PNG, WebP, GIF',
      );
    }

    // Upload to Cloudinary
    const uploadedItem = await this.cloudinaryProvider.uploadImage(
      poolId,
      file.path,
      {
        name: metadata.name || file.originalname,
        rarity: metadata.rarity || RarityTier.COMMON,
        weight: metadata.weight ?? 1,
      },
    );

    // Create database record
    const asset = await this.prisma.cloudinaryAsset.create({
      data: {
        publicId: uploadedItem.metadata.publicId,
        secureUrl: uploadedItem.imageUrl,
        poolId,
        name: metadata.name || file.originalname,
        rarity: metadata.rarity || RarityTier.COMMON,
        weight: metadata.weight ?? 1,
        uploadedBy: adminId,
        tags: metadata.tags || [],
      },
    });

    // Clean up temp file
    try {
      await fs.unlink(file.path);
    } catch {
      // Ignore cleanup errors
    }

    this.logger.log(
      `Uploaded Cloudinary asset to pool ${poolId}: ${asset.publicId}`,
    );
    return asset;
  }

  async updateCloudinaryAsset(
    assetId: string,
    data: {
      name?: string;
      rarity?: RarityTier;
      weight?: number;
      tags?: string[];
    },
  ) {
    const asset = await this.prisma.cloudinaryAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    // Update Cloudinary metadata
    await this.cloudinaryProvider.updateMetadata(asset.publicId, {
      name: data.name,
      rarity: data.rarity,
      weight: data.weight,
    });

    // Update database record
    return this.prisma.cloudinaryAsset.update({
      where: { id: assetId },
      data: {
        name: data.name,
        rarity: data.rarity,
        weight: data.weight,
        tags: data.tags,
      },
    });
  }

  async deleteCloudinaryAsset(assetId: string) {
    const asset = await this.prisma.cloudinaryAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    // Delete from Cloudinary
    try {
      await this.cloudinaryProvider.deleteImage(asset.publicId);
    } catch (error) {
      this.logger.warn(
        `Failed to delete from Cloudinary (may already be deleted):`,
        error,
      );
    }

    // Delete database record
    await this.prisma.cloudinaryAsset.delete({ where: { id: assetId } });
    this.logger.log(`Deleted Cloudinary asset: ${assetId}`);
  }

  async getCloudinaryAssets(poolId: string) {
    return this.prisma.cloudinaryAsset.findMany({
      where: { poolId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Local Asset Management
  // ═══════════════════════════════════════════════════════════════

  async getLocalAssets(poolId: string) {
    const pool = await this.prisma.gachaPool.findUnique({
      where: { id: poolId },
    });
    if (!pool) throw new NotFoundException('Pool not found');

    return this.localProvider.getItems(pool);
  }

  async uploadLocalAsset(
    poolId: string,
    file: Express.Multer.File,
    metadata: {
      name?: string;
      rarity?: RarityTier;
      weight?: number;
    },
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate image
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: JPG, PNG, WebP, GIF',
      );
    }

    // Move file to pool directory
    const poolDir = path.join(process.cwd(), 'public', 'gacha', poolId);
    await fs.mkdir(poolDir, { recursive: true });

    const fileName = `${Date.now()}-${file.originalname}`;
    const destPath = path.join(poolDir, fileName);

    await fs.rename(file.path, destPath);

    // Load existing metadata
    const metadataPath = path.join(poolDir, 'metadata.json');
    let existingMetadata: any = {};
    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      existingMetadata = JSON.parse(content);
    } catch {
      // No existing metadata
    }

    // Update metadata
    existingMetadata[fileName] = {
      filename: fileName,
      name: metadata.name || file.originalname,
      rarity: metadata.rarity || RarityTier.COMMON,
      weight: metadata.weight || 1,
      uploadedAt: new Date().toISOString(),
    };

    await fs.writeFile(metadataPath, JSON.stringify(existingMetadata, null, 2));

    this.logger.log(`Uploaded local asset to pool ${poolId}: ${fileName}`);
    return existingMetadata[fileName];
  }

  async updateLocalAssetMetadata(
    assetId: string,
    metadata: {
      name?: string;
      rarity?: RarityTier;
      weight?: number;
    },
  ) {
    // assetId format: "local-{poolId}-{filename}"
    const match = assetId.match(/^local-(.+)-(.+)$/);
    if (!match) {
      throw new BadRequestException('Invalid asset ID format');
    }

    const [, poolId, filename] = match;
    const metadataPath = path.join(
      process.cwd(),
      'public',
      'gacha',
      poolId,
      'metadata.json',
    );

    // Load and update metadata
    let existingMetadata: any = {};
    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      existingMetadata = JSON.parse(content);
    } catch {
      throw new NotFoundException('Asset metadata not found');
    }

    if (!existingMetadata[filename]) {
      throw new NotFoundException('Asset not found');
    }

    existingMetadata[filename] = {
      ...existingMetadata[filename],
      ...metadata,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(metadataPath, JSON.stringify(existingMetadata, null, 2));
    return existingMetadata[filename];
  }

  async deleteLocalAsset(assetId: string) {
    const match = assetId.match(/^local-(.+)-(.+)$/);
    if (!match) {
      throw new BadRequestException('Invalid asset ID format');
    }

    const [, poolId, filename] = match;
    const filePath = path.join(
      process.cwd(),
      'public',
      'gacha',
      poolId,
      filename,
    );
    const metadataPath = path.join(
      process.cwd(),
      'public',
      'gacha',
      poolId,
      'metadata.json',
    );

    // Delete file
    try {
      await fs.unlink(filePath);
    } catch {
      // File may not exist
    }

    // Update metadata
    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(content);
      delete metadata[filename];
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch {
      // Metadata may not exist
    }

    this.logger.log(`Deleted local asset: ${assetId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // Provider Health & Diagnostics
  // ═══════════════════════════════════════════════════════════════

  async getProviderHealth() {
    return this.providerRegistry.healthCheck();
  }

  async clearCache(source?: string, poolId?: string) {
    this.providerRegistry.clearCache(source as AssetSource | undefined, poolId);

    return {
      message: 'Cache cleared',
      source: source || 'all',
      poolId: poolId || 'all',
    };
  }
}
