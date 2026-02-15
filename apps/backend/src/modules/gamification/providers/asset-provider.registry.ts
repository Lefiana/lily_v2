// apps/backend/src/modules/gamification/providers/asset-provider.registry.ts

import { Injectable, Logger } from '@nestjs/common';
import { GachaPool } from '@prisma/client';
import {
  IAssetProvider,
  AssetItem,
  ProviderHealthStatus,
} from './asset-provider.interface';
import { LocalAssetProvider } from './local-asset.provider';
import { CloudinaryAssetProvider } from './cloudinary-asset.provider';
import { WallhavenAssetProvider } from './wallhaven-asset.provider';

export enum AssetSource {
  LOCAL = 'local',
  CLOUDINARY = 'cloudinary',
  WALLHAVEN = 'wallhaven',
}

@Injectable()
export class AssetProviderRegistry {
  private readonly logger = new Logger(AssetProviderRegistry.name);
  private readonly providers: Map<AssetSource, IAssetProvider> = new Map();

  constructor(
    private readonly localProvider: LocalAssetProvider,
    private readonly cloudinaryProvider: CloudinaryAssetProvider,
    private readonly wallhavenProvider: WallhavenAssetProvider,
  ) {
    this.providers.set(AssetSource.LOCAL, localProvider);
    this.providers.set(AssetSource.CLOUDINARY, cloudinaryProvider);
    this.providers.set(AssetSource.WALLHAVEN, wallhavenProvider);
  }

  /**
   * Get items from all enabled providers with fallback chain
   */
  async getItems(
    pool: GachaPool,
    sources: AssetSource[] = [
      AssetSource.LOCAL,
      AssetSource.CLOUDINARY,
      AssetSource.WALLHAVEN,
    ],
    limit: number = 24,
  ): Promise<AssetItem[]> {
    const allItems: AssetItem[] = [];
    const errors: string[] = [];

    for (const source of sources) {
      const provider = this.providers.get(source);

      if (!provider) {
        this.logger.warn(`Provider not found for source: ${source}`);
        continue;
      }

      if (!provider.config.enabled) {
        this.logger.debug(`Provider ${provider.name} is disabled`);
        continue;
      }

      try {
        const items = await provider.getItems(pool, limit);

        if (items.length > 0) {
          // Tag items with their source
          const taggedItems = items.map((item) => ({
            ...item,
            metadata: {
              ...item.metadata,
              providerSource: source,
            },
          }));

          allItems.push(...taggedItems);

          // If we have enough items, stop fetching
          if (allItems.length >= limit) {
            break;
          }
        }
      } catch (error) {
        const errorMsg = `${provider.name} failed: ${(error as Error).message}`;
        this.logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    if (allItems.length === 0 && errors.length > 0) {
      throw new Error(`All asset providers failed:\n${errors.join('\n')}`);
    }

    // Return up to limit, shuffled for variety
    return this.shuffleArray(allItems).slice(0, limit);
  }

  /**
   * Get URL for an item with transformations
   */
  getItemUrl(item: AssetItem, options?: any): string {
    const source = item.metadata?.providerSource as AssetSource;
    const provider = source ? this.providers.get(source) : null;

    if (provider) {
      return provider.getItemUrl(item, options);
    }

    // Fallback to stored URL
    return item.imageUrl;
  }

  /**
   * Health check all providers
   */
  async healthCheck(): Promise<Record<AssetSource, ProviderHealthStatus>> {
    const results: Partial<Record<AssetSource, ProviderHealthStatus>> = {};

    for (const [source, provider] of this.providers) {
      results[source] = await provider.healthCheck();
    }

    return results as Record<AssetSource, ProviderHealthStatus>;
  }

  /**
   * Get specific provider by source
   */
  getProvider(source: AssetSource): IAssetProvider | undefined {
    return this.providers.get(source);
  }

  /**
   * Clear caches for all or specific provider
   */
  clearCache(source?: AssetSource, poolId?: string): void {
    if (source) {
      const provider = this.providers.get(source);
      if (provider && 'clearCache' in provider) {
        (provider as any).clearCache(poolId);
      }
    } else {
      for (const [, provider] of this.providers) {
        if ('clearCache' in provider) {
          (provider as any).clearCache(poolId);
        }
      }
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
