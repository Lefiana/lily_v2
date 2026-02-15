// apps/backend/src/modules/gamification/providers/asset-provider.interface.ts

import { GachaPool, RarityTier } from '@prisma/client';

export interface AssetProviderConfig {
  priority: number; // Lower = higher priority for fallback
  enabled: boolean;
  timeout?: number; // Request timeout in ms
  retryAttempts?: number;
}

export interface AssetItem {
  id: string;
  name: string;
  imageUrl: string;
  rarity: RarityTier;
  weight: number; // For weighted random selection
  metadata?: Record<string, any>;
}

export interface IAssetProvider {
  readonly name: string;
  readonly config: AssetProviderConfig;

  /**
   * Fetch available items for a pool
   */
  getItems(pool: GachaPool, limit?: number): Promise<AssetItem[]>;

  /**
   * Get direct URL for an item (handles transformation if needed)
   */
  getItemUrl(item: AssetItem, options?: ImageTransformOptions): string;

  /**
   * Validate item is still accessible
   */
  validateItem(item: AssetItem): Promise<boolean>;

  /**
   * Check if provider is healthy
   */
  healthCheck(): Promise<ProviderHealthStatus>;
}

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: 'auto' | 'webp' | 'jpg' | 'png';
}

export interface ProviderHealthStatus {
  healthy: boolean;
  latency: number;
  lastChecked: Date;
  error?: string;
}

export enum AssetSource {
  WALLHAVEN = 'wallhaven',
  LOCAL = 'local',
  CLOUDINARY = 'cloudinary',
}
