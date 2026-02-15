// apps/backend/src/modules/gamification/providers/local-asset.provider.ts

import { Injectable, Logger } from '@nestjs/common';
import { GachaPool, RarityTier } from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  IAssetProvider,
  AssetProviderConfig,
  AssetItem,
  ImageTransformOptions,
  ProviderHealthStatus,
} from './asset-provider.interface';

interface LocalAssetMetadata {
  filename: string;
  rarity: RarityTier;
  weight: number;
  name?: string;
}

@Injectable()
export class LocalAssetProvider implements IAssetProvider {
  readonly name = 'LocalAssetProvider';
  readonly config: AssetProviderConfig = {
    priority: 1, // Highest priority - check local first
    enabled: true,
    timeout: 5000,
    retryAttempts: 2,
  };

  private readonly logger = new Logger(LocalAssetProvider.name);
  private readonly basePath: string;
  private readonly baseUrl: string;

  constructor() {
    // Store assets in backend public directory
    this.basePath = path.join(process.cwd(), 'public', 'gacha');
    this.baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  }

  async getItems(pool: GachaPool, limit: number = 24): Promise<AssetItem[]> {
    const poolPath = path.join(this.basePath, pool.id);

    try {
      // Ensure directory exists
      await fs.mkdir(poolPath, { recursive: true });

      // Read directory contents
      const files = await fs.readdir(poolPath);
      const imageFiles = files.filter((f) =>
        /\.(jpg|jpeg|png|webp|gif)$/i.test(f),
      );

      // Load metadata file if exists
      const metadataPath = path.join(poolPath, 'metadata.json');
      let metadata: Record<string, LocalAssetMetadata> = {};

      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);
      } catch {
        this.logger.warn(
          `No metadata.json found for pool ${pool.id}, using defaults`,
        );
      }

      // Map to AssetItems
      const items: AssetItem[] = imageFiles
        .slice(0, limit)
        .map((filename, index) => {
          const fileMetadata = metadata[filename] || {};

          return {
            id: `local-${pool.id}-${filename}`,
            name: fileMetadata.name || `Item #${index + 1}`,
            imageUrl: this.getItemUrl({
              id: '',
              imageUrl: filename,
              name: '',
              rarity: RarityTier.COMMON,
              weight: 1,
              metadata: { poolId: pool.id, filename },
            }),
            rarity:
              fileMetadata.rarity || this.inferRarityFromFilename(filename),
            weight: fileMetadata.weight || 1,
            metadata: {
              filename,
              source: 'local',
              poolId: pool.id,
            },
          };
        });

      this.logger.log(`Found ${items.length} local assets for pool ${pool.id}`);
      return items;
    } catch (error) {
      this.logger.error(
        `Failed to load local assets for pool ${pool.id}:`,
        error,
      );
      return [];
    }
  }

  getItemUrl(item: AssetItem, options?: ImageTransformOptions): string {
    const poolId = item.metadata?.poolId || 'default';
    const filename = item.metadata?.filename || item.imageUrl;

    // Build URL to static file endpoint
    return `${this.baseUrl}/gacha/${poolId}/${filename}`;
  }

  async validateItem(item: AssetItem): Promise<boolean> {
    try {
      const poolId = item.metadata?.poolId || 'default';
      const filename = item.metadata?.filename;
      const filePath = path.join(this.basePath, poolId, filename);

      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();

    try {
      await fs.access(this.basePath);
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
   * Infer rarity from filename patterns (e.g., "legendary_item_01.jpg")
   */
  private inferRarityFromFilename(filename: string): RarityTier {
    const lower = filename.toLowerCase();
    if (lower.includes('legendary')) return RarityTier.LEGENDARY;
    if (lower.includes('epic')) return RarityTier.EPIC;
    if (lower.includes('rare')) return RarityTier.RARE;
    if (lower.includes('uncommon')) return RarityTier.UNCOMMON;
    return RarityTier.COMMON;
  }

  /**
   * Admin utility: Save metadata for pool
   */
  async savePoolMetadata(
    poolId: string,
    metadata: Record<string, LocalAssetMetadata>,
  ): Promise<void> {
    const metadataPath = path.join(this.basePath, poolId, 'metadata.json');
    await fs.mkdir(path.dirname(metadataPath), { recursive: true });
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    this.logger.log(`Saved metadata for pool ${poolId}`);
  }
}
