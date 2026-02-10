// apps/web/hooks/useAssets.ts
"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import {
  IAsset,
  IAssetFilters,
  ICreateAssetDto,
  IUpdateAssetDto,
  AssetCondition,
  AssetStatus,
} from "@/types/asset";
import { toast } from "sonner";

const fetcher = async (url: string) => {
  try {
    const response = await api.get(url);
    return response.data;
  } catch (err: any) {
    toast.error("Failed to load assets.");
    throw err;
  }
};

export const useAssets = (
  userId: string,
  filters?: IAssetFilters,
  query?: string,
) => {
  // Build query string
  const queryParams = new URLSearchParams();
  if (filters?.category) queryParams.append("category", filters.category);
  if (filters?.status) queryParams.append("status", filters.status);
  if (filters?.condition) queryParams.append("condition", filters.condition);
  if (filters?.availableOnly) queryParams.append("availableOnly", "true");
  if (query) queryParams.append("q", query);

  const queryString = queryParams.toString();
  const endpoint = `/assets${queryString ? `?${queryString}` : ""}`;

  const {
    data: assets,
    error,
    isLoading,
    mutate,
  } = useSWR<IAsset[]>(userId ? endpoint : null, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  // Create asset with optimistic update
  const createAsset = async (dto: ICreateAssetDto) => {
    const optimisticAsset: IAsset = {
      id: `temp-${Date.now()}`,
      name: dto.name,
      description: dto.description ?? null,
      sku: dto.sku ?? null,
      serialNumber: dto.serialNumber ?? null,
      category: dto.category,
      quantity: dto.quantity,
      available: dto.quantity,
      condition: dto.condition ?? AssetCondition.WORKING,
      status: dto.status ?? AssetStatus.AVAILABLE,
      location: dto.location ?? null,
      notes: dto.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
    };

    mutate([optimisticAsset, ...(assets || [])], false);

    try {
      const response = await api.post("/assets", dto);
      mutate();
      toast.success("Asset created successfully");
      return response.data;
    } catch (err) {
      mutate();
      toast.error("Failed to create asset");
      throw err;
    }
  };

  // Update asset with optimistic update
  const updateAsset = async (id: string, dto: IUpdateAssetDto) => {
    const currentAssets = assets || [];
    const updatedAssets = currentAssets.map((a) =>
      a.id === id ? { ...a, ...dto } : a,
    );

    mutate(updatedAssets, false);

    try {
      const response = await api.patch(`/assets/${id}`, dto);
      mutate();
      toast.success("Asset updated successfully");
      return response.data;
    } catch (err) {
      mutate();
      toast.error("Failed to update asset");
      throw err;
    }
  };

  // Delete asset with optimistic update
  const deleteAsset = async (id: string) => {
    mutate(
      assets?.filter((a) => a.id !== id),
      false,
    );

    try {
      await api.delete(`/assets/${id}`);
      mutate();
      toast.success("Asset deleted successfully");
    } catch (err) {
      mutate();
      toast.error("Failed to delete asset");
      throw err;
    }
  };

  return {
    assets: assets || [],
    isLoading,
    error,
    createAsset,
    updateAsset,
    deleteAsset,
    revalidate: () => mutate(),
  };
};

// Hook for available assets only
export const useAvailableAssets = (userId: string, category?: string) => {
  const queryParams = new URLSearchParams();
  if (category) queryParams.append("category", category);

  const queryString = queryParams.toString();
  const endpoint = `/assets/available${queryString ? `?${queryString}` : ""}`;

  const {
    data: assets,
    error,
    isLoading,
    mutate,
  } = useSWR<IAsset[]>(userId ? endpoint : null, fetcher);

  return {
    assets: assets || [],
    isLoading,
    error,
    revalidate: () => mutate(),
  };
};
