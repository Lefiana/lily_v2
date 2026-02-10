// apps/backend/src/modules/assets/domain/asset.types.ts

import { AssetCondition, AssetStatus } from '@prisma/client';

export { AssetCondition, AssetStatus };

export enum AssetEvents {
  ASSET_CREATED = 'asset_created',
  ASSET_UPDATED = 'asset_updated',
  ASSET_DELETED = 'asset_deleted',
  ASSET_AVAILABILITY_CHANGED = 'asset_availability_changed',
}

export interface IAsset {
  id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  serialNumber?: string | null;
  category: string;
  quantity: number;
  available: number;
  condition: AssetCondition;
  status: AssetStatus;
  location?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface IAssetAttachment {
  id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  createdAt: Date;
  assetId: string;
}

export interface ICreateAssetDto {
  name: string;
  description?: string;
  sku?: string;
  serialNumber?: string;
  category: string;
  quantity: number;
  condition?: AssetCondition;
  status?: AssetStatus;
  location?: string;
  notes?: string;
}

export interface IUpdateAssetDto {
  name?: string;
  description?: string;
  sku?: string;
  serialNumber?: string;
  category?: string;
  quantity?: number;
  condition?: AssetCondition;
  status?: AssetStatus;
  location?: string;
  notes?: string;
}

export interface IAssetFilters {
  category?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  query?: string;
  availableOnly?: boolean;
}

export interface IAssetAvailabilityPayload {
  assetId: string;
  available: number;
  total: number;
}

export type AssetEventPayload =
  | IAsset
  | { id: string }
  | IAssetAvailabilityPayload
  | { success: boolean }
  | { assetId: string; attachment: IAssetAttachment }
  | { assetId: string; attachmentId: string };
