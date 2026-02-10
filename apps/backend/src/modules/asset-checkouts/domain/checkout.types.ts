// apps/backend/src/modules/asset-checkouts/domain/checkout.types.ts

import { CheckoutStatus, AssetCondition } from '@prisma/client';
import { IAsset } from '@modules/assets/domain';

export { CheckoutStatus, AssetCondition };

export enum CheckoutEvents {
  CHECKOUT_CREATED = 'checkout_created',
  CHECKOUT_UPDATED = 'checkout_updated',
  CHECKOUT_RETURNED = 'checkout_returned',
  CHECKOUT_CANCELLED = 'checkout_cancelled',
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

export interface ICheckoutFilters {
  status?: CheckoutStatus;
  borrowerId?: string;
  assetId?: string;
  overdueOnly?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

export type CheckoutEventPayload =
  | IAssetCheckout
  | { id: string }
  | { success: boolean }
  | { assetId: string; available: number; total: number };
