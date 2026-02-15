// apps/backend/src/modules/gamification/providers/cloudinary-asset.provider.ts

import { Injectable, Logger } from '@nestjs/common';
import { GachaPool, RarityTier } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import * as path from 'path';
import {
  IAssetProvider,
  AssetProviderConfig,
  AssetItem,
  ImageTransformOptions,
  ProviderHealthStatus,
} from './asset-provider.interface';

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
}

@Injectable()
export class CloudinaryAssetProvider implements IAssetProvider {
  readonly name = 'CloudinaryAssetProvider';
  readonly config: AssetProviderConfig = {
    priority: 2, // Check after local, before Wallhaven
    enabled: true,
    timeout: 10000,
    retryAttempts: 3,
  };

  private readonly logger = new Logger(CloudinaryAssetProvider.name);
  private readonly folder: string;
  private readonly isConfigured: boolean;

  constructor() {
    const config: CloudinaryConfig = {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
      folder: process.env.CLOUDINARY_GACHA_FOLDER || 'gacha',
    };

    this.isConfigured = !!(
      config.cloudName &&
      config.apiKey &&
      config.apiSecret
    );
    this.folder = config.folder;

    if (this.isConfigured) {
      cloudinary.config({
        cloud_name: config.cloudName,
        api_key: config.apiKey,
        api_secret: config.apiSecret,
      });
      this.logger.log('Cloudinary provider initialized');
    } else {
      this.logger.warn('Cloudinary not configured, provider disabled');
    }
  }

  async getItems(pool: GachaPool, limit: number = 24): Promise<AssetItem[]> {
    if (!this.isConfigured) {
      return [];
    }

    try {
      const folderPath = `${this.folder}/${pool.id}`;

      // Fetch resources from Cloudinary
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folderPath,
        max_results: limit,
        context: true, // Fetch metadata (rarity, weight)
        tags: true,
      });

      const items: AssetItem[] = result.resources.map((resource: any) => {
        // Parse context metadata
        const context = resource.context || {};
        const rarity = this.parseRarity(context.rarity);
        const weight = parseInt(context.weight) || 1;
        const name = context.name || resource.public_id.split('/').pop();

        return {
          id: `cloudinary-${resource.asset_id}`,
          name,
          imageUrl: resource.secure_url,
          rarity,
          weight,
          metadata: {
            publicId: resource.public_id,
            format: resource.format,
            bytes: resource.bytes,
            source: 'cloudinary',
            poolId: pool.id,
            tags: resource.tags || [],
          },
        };
      });

      this.logger.log(
        `Fetched ${items.length} Cloudinary assets for pool ${pool.id}`,
      );
      return items;
    } catch (error) {
      this.logger.error(
        `Failed to fetch Cloudinary assets for pool ${pool.id}:`,
        error,
      );
      return [];
    }
  }

  getItemUrl(item: AssetItem, options?: ImageTransformOptions): string {
    const publicId = item.metadata?.publicId;

    if (!publicId) {
      return item.imageUrl; // Fallback to stored URL
    }

    // Build transformation options
    const transformation: any = {};

    if (options?.width) transformation.width = options.width;
    if (options?.height) transformation.height = options.height;
    if (options?.quality) transformation.quality = options.quality;
    if (options?.format && options.format !== 'auto') {
      transformation.fetch_format = options.format;
    }

    // Generate optimized URL
    return cloudinary.url(publicId, {
      secure: true,
      transformation:
        Object.keys(transformation).length > 0 ? [transformation] : undefined,
    });
  }

  async validateItem(item: AssetItem): Promise<boolean> {
    if (!this.isConfigured || !item.metadata?.publicId) {
      return false;
    }

    try {
      await cloudinary.api.resource(item.metadata.publicId);
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();

    if (!this.isConfigured) {
      return {
        healthy: false,
        latency: 0,
        lastChecked: new Date(),
        error: 'Cloudinary not configured',
      };
    }

    try {
      await cloudinary.api.ping();
      return {
        healthy: true,
        latency: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        lastChecked: new Date(),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Upload image to Cloudinary with metadata
   */
  async uploadImage(
    poolId: string,
    filePath: string,
    metadata: {
      name: string;
      rarity: RarityTier;
      weight: number;
    },
  ): Promise<AssetItem> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    const publicId = `${this.folder}/${poolId}/${Date.now()}-${path.basename(filePath, path.extname(filePath))}`;

    const result = await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      folder: '',
      context: {
        name: metadata.name,
        rarity: metadata.rarity,
        weight: metadata.weight.toString(),
        poolId,
      },
      tags: [`pool-${poolId}`, metadata.rarity.toLowerCase()],
    });

    return {
      id: `cloudinary-${result.asset_id}`,
      name: metadata.name,
      imageUrl: result.secure_url,
      rarity: metadata.rarity,
      weight: metadata.weight,
      metadata: {
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
        source: 'cloudinary',
        poolId,
      },
    };
  }

  /**
   * Update image metadata (rarity, weight, name)
   */
  async updateMetadata(
    publicId: string,
    metadata: {
      name?: string;
      rarity?: RarityTier;
      weight?: number;
    },
  ): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    const context: any = {};
    if (metadata.name) context.name = metadata.name;
    if (metadata.rarity) context.rarity = metadata.rarity;
    if (metadata.weight !== undefined)
      context.weight = metadata.weight.toString();

    await cloudinary.api.update(publicId, { context });

    // Update tags if rarity changed
    if (metadata.rarity) {
      await cloudinary.uploader.replace_tag(metadata.rarity.toLowerCase(), [
        publicId,
      ]);
    }
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    await cloudinary.uploader.destroy(publicId);
  }

  /**
   * Get image details from Cloudinary
   */
  async getImageDetails(
    publicId: string,
  ): Promise<{ secureUrl: string; publicId: string }> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    const result = await cloudinary.api.resource(publicId);
    return {
      secureUrl: result.secure_url,
      publicId: result.public_id,
    };
  }

  private parseRarity(rarityString?: string): RarityTier {
    if (!rarityString) return RarityTier.COMMON;

    const normalized = rarityString.toUpperCase();
    if (normalized in RarityTier) {
      return RarityTier[normalized as keyof typeof RarityTier];
    }

    return RarityTier.COMMON;
  }
}
