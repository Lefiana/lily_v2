// apps/web/hooks/useCheckouts.ts
"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import {
  IAssetCheckout,
  ICreateCheckoutDto,
  IProcessReturnDto,
  ICheckoutFilters,
  CheckoutStatus,
} from "@/types/asset";
import { toast } from "sonner";

const fetcher = async (url: string) => {
  try {
    const response = await api.get(url);
    return response.data;
  } catch (err: any) {
    toast.error("Failed to load checkouts.");
    throw err;
  }
};

export const useCheckouts = (userId: string, filters?: ICheckoutFilters) => {
  // Build query string
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append("status", filters.status);
  if (filters?.borrowerId) queryParams.append("borrowerId", filters.borrowerId);
  if (filters?.assetId) queryParams.append("assetId", filters.assetId);
  if (filters?.overdueOnly) queryParams.append("overdueOnly", "true");

  const queryString = queryParams.toString();
  const endpoint = `/asset-checkouts${queryString ? `?${queryString}` : ""}`;

  const {
    data: checkouts,
    error,
    isLoading,
    mutate,
  } = useSWR<IAssetCheckout[]>(userId ? endpoint : null, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  // Get overdue count
  const overdueCount = useMemo(() => {
    if (!checkouts) return 0;
    const now = new Date();
    return checkouts.filter(
      (c) => c.status === CheckoutStatus.BORROWED && new Date(c.dueDate) < now,
    ).length;
  }, [checkouts]);

  // Create checkout with optimistic update
  const createCheckout = async (dto: ICreateCheckoutDto) => {
    const optimisticCheckout: IAssetCheckout = {
      id: `temp-${Date.now()}`,
      ...dto,
      dueDate: new Date(dto.dueDate),
      borrowedAt: new Date(),
      status: CheckoutStatus.BORROWED,
      damageFlag: false,
      checkedOutBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
      borrowerName: dto.borrowerName,
    };

    mutate([optimisticCheckout, ...(checkouts || [])], false);

    try {
      const response = await api.post("/asset-checkouts", dto);
      mutate();
      toast.success("Checkout created successfully");
      return response.data;
    } catch (err) {
      mutate();
      toast.error("Failed to create checkout");
      throw err;
    }
  };

  // Process return
  const processReturn = async (id: string, dto: IProcessReturnDto) => {
    try {
      const response = await api.post(`/asset-checkouts/${id}/return`, dto);
      mutate();
      toast.success("Return processed successfully");
      return response.data;
    } catch (err) {
      toast.error("Failed to process return");
      throw err;
    }
  };

  // Cancel checkout
  const cancelCheckout = async (id: string) => {
    mutate(
      checkouts?.filter((c) => c.id !== id),
      false,
    );

    try {
      await api.delete(`/asset-checkouts/${id}`);
      mutate();
      toast.success("Checkout cancelled successfully");
    } catch (err) {
      mutate();
      toast.error("Failed to cancel checkout");
      throw err;
    }
  };

  return {
    checkouts: checkouts || [],
    isLoading,
    error,
    overdueCount,
    createCheckout,
    processReturn,
    cancelCheckout,
    revalidate: () => mutate(),
  };
};

// Hook for active checkouts
export const useActiveCheckouts = (userId: string, borrowerId?: string) => {
  const queryParams = new URLSearchParams();
  if (borrowerId) queryParams.append("borrowerId", borrowerId);

  const queryString = queryParams.toString();
  const endpoint = `/asset-checkouts/active${queryString ? `?${queryString}` : ""}`;

  const {
    data: checkouts,
    error,
    isLoading,
    mutate,
  } = useSWR<IAssetCheckout[]>(userId ? endpoint : null, fetcher);

  return {
    checkouts: checkouts || [],
    isLoading,
    error,
    revalidate: () => mutate(),
  };
};

// Hook for overdue checkouts
export const useOverdueCheckouts = (userId: string) => {
  const {
    data: checkouts,
    error,
    isLoading,
    mutate,
  } = useSWR<IAssetCheckout[]>(
    userId ? "/asset-checkouts/overdue" : null,
    fetcher,
  );

  return {
    checkouts: checkouts || [],
    isLoading,
    error,
    revalidate: () => mutate(),
  };
};

// Need to import useMemo
import { useMemo } from "react";
