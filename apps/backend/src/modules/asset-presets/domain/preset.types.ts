// apps/backend/src/modules/asset-presets/domain/preset.types.ts

import { IAsset } from '@modules/assets/domain';

export interface IAssetPresetItem {
  id: string;
  quantity: number;
  notes?: string | null;
  assetId: string;
  asset: IAsset;
}

export interface IAssetPreset {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  items: IAssetPresetItem[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface ICreatePresetDto {
  name: string;
  description?: string;
  items: IPresetItemDto[];
}

export interface IPresetItemDto {
  assetId: string;
  quantity: number;
  notes?: string;
}

export interface IUpdatePresetDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  items?: IPresetItemDto[];
}
