// apps/backend/src/modules/gamification/providers/wallhaven-asset.provider.ts

import { Injectable, Logger } from '@nestjs/common';
import { GachaPool, RarityTier } from '@prisma/client';
import axios from 'axios';
import {
  IAssetProvider,
  AssetProviderConfig,
  AssetItem,
  ImageTransformOptions,
  ProviderHealthStatus,
} from './asset-provider.interface';

interface WallhavenImage {
  id: string;
  url: string;
  thumbs: { original: string };
  resolution: string;
}

interface WallhavenResponse {
  data: WallhavenImage[];
}

@Injectable()
export class WallhavenAssetProvider implements IAssetProvider {
  readonly name = 'WallhavenAssetProvider';
  readonly config: AssetProviderConfig = {
    priority: 3, // Lowest priority - fallback only
    enabled: true,
    timeout: 10000,
    retryAttempts: 2,
  };

  private readonly logger = new Logger(WallhavenAssetProvider.name);
  private readonly apiUrl = 'https://wallhaven.cc/api/v1/search';
  private readonly cache = new Map<
    string,
    { items: AssetItem[]; timestamp: number }
  >();
  private readonly cacheTtl = 1000 * 60 * 30; // 30 minutes

  async getItems(pool: GachaPool, limit: number = 24): Promise<AssetItem[]> {
    const cacheKey = `${pool.id}-${pool.wallhavenTags}-${limit}`;
    const cached = this.cache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      this.logger.debug(`Returning cached Wallhaven data for pool ${pool.id}`);
      return cached.items;
    }

    try {
      const response = await axios.get<WallhavenResponse>(this.apiUrl, {
        params: {
          q: pool.wallhavenTags || 'anime',
          sorting: 'random',
          purity: '100', // SFW only
          page: 1,
        },
        headers: {
          // Inject API key if available for higher rate limits
          ...(process.env.WALLHAVEN_API_KEY && {
            'X-API-Key': process.env.WALLHAVEN_API_KEY,
          }),
        },
        timeout: this.config.timeout,
      });

      const images: WallhavenImage[] = response.data.data.slice(0, limit);

      // Assign weighted random rarities
      const items: AssetItem[] = images.map((img) => ({
        id: `wallhaven-${img.id}`,
        name: `Wallpaper #${img.id}`,
        imageUrl: img.thumbs.original,
        rarity: this.assignRandomRarity(),
        weight: 1,
        metadata: {
          source: 'wallhaven',
          poolId: pool.id,
          originalUrl: img.url,
          resolution: img.resolution,
        },
      }));

      // Update cache
      this.cache.set(cacheKey, { items, timestamp: Date.now() });

      this.logger.log(
        `Fetched ${items.length} Wallhaven images for pool ${pool.id}`,
      );
      return items;
    } catch (error) {
      this.logger.error(
        `Failed to fetch from Wallhaven for pool ${pool.id}:`,
        error,
      );

      // Return expired cache as fallback
      if (cached) {
        this.logger.warn(`Using expired cache as fallback for pool ${pool.id}`);
        return cached.items;
      }

      throw new Error(
        `Unable to fetch gacha items from Wallhaven: ${(error as Error).message}`,
      );
    }
  }

  getItemUrl(item: AssetItem, options?: ImageTransformOptions): string {
    // Wallhaven doesn't support on-the-fly transformations
    // Return the stored thumbnail URL
    return item.imageUrl;
  }

  async validateItem(item: AssetItem): Promise<boolean> {
    try {
      // Check if image URL is accessible
      const response = await axios.head(item.imageUrl, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();

    try {
      const response = await axios.get(this.apiUrl, {
        params: { q: 'test', page: 1 },
        headers: {
          ...(process.env.WALLHAVEN_API_KEY && {
            'X-API-Key': process.env.WALLHAVEN_API_KEY,
          }),
        },
        timeout: 5000,
      });

      return {
        healthy: response.status === 200,
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
   * Clear cache for specific pool or all pools
   */
  clearCache(poolId?: string): void {
    if (poolId) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(poolId)) {
          this.cache.delete(key);
        }
      }
      this.logger.log(`Cleared Wallhaven cache for pool ${poolId}`);
    } else {
      this.cache.clear();
      this.logger.log('Cleared all Wallhaven cache');
    }
  }

  private assignRandomRarity(): RarityTier {
    const rand = Math.random() * 100;
    if (rand < 60) return RarityTier.COMMON;
    if (rand < 85) return RarityTier.UNCOMMON;
    if (rand < 95) return RarityTier.RARE;
    if (rand < 99) return RarityTier.EPIC;
    return RarityTier.LEGENDARY;
  }
}
