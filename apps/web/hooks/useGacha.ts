// apps/web/hooks/useGacha.ts
"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface GachaPool {
  id: string;
  name: string;
  description: string | null;
  type: "STANDARD" | "PREMIUM";
  cost: number;
  isAdminOnly: boolean;
  _count: { items: number };
}

export interface GachaItem {
  id: string;
  name: string;
  imageUrl: string;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
}

export interface CollectionItem {
  id: string;
  item: GachaItem;
  obtainedAt: string;
  pullCount: number;
}

export interface PullResult {
  pull: {
    id: string;
    item: GachaItem;
    cost: number;
    pulledAt: string;
  };
  isNew: boolean;
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export const useGacha = (userId: string) => {
  const { data: pools, error: poolsError } = useSWR<GachaPool[]>(
    userId ? "/gacha/pools" : null,
    fetcher,
  );

  const { data: collection, mutate: mutateCollection } = useSWR<CollectionItem[]>(
    userId ? "/gacha/collection" : null,
    fetcher,
  );

  const pull = async (poolId: string): Promise<PullResult> => {
    try {
      const response = await api.post<PullResult>("/gacha/pull", { poolId });
      mutateCollection();

      const rarityLabels: Record<string, string> = {
        COMMON: "Common",
        UNCOMMON: "Uncommon",
        RARE: "Rare",
        EPIC: "Epic",
        LEGENDARY: "Legendary!",
      };

      const rarity = response.data.pull.item.rarity;
      if (rarity === "LEGENDARY") {
        toast.success(
          `✨ LEGENDARY! You obtained: ${response.data.pull.item.name}`,
        );
      } else {
        toast.success(
          `${rarityLabels[rarity]} pull: ${response.data.pull.item.name}`,
        );
      }

      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || "Pull failed";
      toast.error(message);
      throw err;
    }
  };

  return {
    pools: pools || [],
    collection: collection || [],
    isLoading: !pools && !poolsError,
    pull,
    revalidate: () => mutateCollection(),
  };
};
