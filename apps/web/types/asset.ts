// apps/web/types/asset.ts

// Enums (mirrored from backend)
export enum AssetCondition {
  WORKING = "WORKING",
  DAMAGED = "DAMAGED",
  DECOMMISSIONED = "DECOMMISSIONED",
  UNDER_MAINTENANCE = "UNDER_MAINTENANCE",
}

export enum AssetStatus {
  AVAILABLE = "AVAILABLE",
  DEPLOYED = "DEPLOYED",
  RESERVED = "RESERVED",
  IN_TRANSIT = "IN_TRANSIT",
  UNAVAILABLE = "UNAVAILABLE",
}

export enum CheckoutStatus {
  BORROWED = "BORROWED",
  RETURNED = "RETURNED",
  OVERDUE = "OVERDUE",
  DAMAGED = "DAMAGED",
  LOST = "LOST",
}

// Asset Types
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

export interface IAssetCheckoutItem {
  id: string;
  quantity: number;
  returnedAt?: Date | null;
  condition: AssetCondition;
  notes?: string | null;
  assetId: string;
  asset: IAsset;
}

export interface IAssetCheckout {
  id: string;
  borrowerName: string;
  borrowerEmail?: string | null;
  borrowerPhone?: string | null;
  borrowerDepartment?: string | null;
  borrowerId?: string | null;
  borrowedAt: Date;
  dueDate: Date;
  returnedAt?: Date | null;
  status: CheckoutStatus;
  computedStatus?: CheckoutStatus;
  isOverdue?: boolean;
  daysOverdue?: number;
  damageFlag: boolean;
  damageNotes?: string | null;
  returnCondition?: AssetCondition | null;
  remarks?: string | null;
  checkedOutBy: string;
  checkedInBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: IAssetCheckoutItem[];
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

export interface IAssetPresetItem {
  id: string;
  quantity: number;
  notes?: string | null;
  assetId: string;
  asset: IAsset;
}

// DTOs
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

export interface ICreateCheckoutDto {
  borrowerName: string;
  borrowerEmail?: string;
  borrowerPhone?: string;
  borrowerDepartment?: string;
  borrowerId?: string;
  dueDate: Date | string;
  remarks?: string;
  items: ICheckoutItemDto[];
}

export interface ICheckoutItemDto {
  assetId: string;
  quantity: number;
  notes?: string;
}

export interface IProcessReturnDto {
  condition: AssetCondition;
  damageFlag: boolean;
  damageNotes?: string;
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

// Filters
export interface IAssetFilters {
  category?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  query?: string;
  availableOnly?: boolean;
}

export interface ICheckoutFilters {
  status?: CheckoutStatus;
  borrowerId?: string;
  assetId?: string;
  overdueOnly?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

// Events
export enum AssetEvents {
  ASSET_CREATED = "asset_created",
  ASSET_UPDATED = "asset_updated",
  ASSET_DELETED = "asset_deleted",
  ASSET_AVAILABILITY_CHANGED = "asset_availability_changed",
}

export enum CheckoutEvents {
  CHECKOUT_CREATED = "checkout_created",
  CHECKOUT_UPDATED = "checkout_updated",
  CHECKOUT_RETURNED = "checkout_returned",
  CHECKOUT_CANCELLED = "checkout_cancelled",
}
