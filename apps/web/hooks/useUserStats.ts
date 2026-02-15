// apps/web/hooks/useUserStats.ts
"use client";

import useSWR from "swr";
import { api } from "@/lib/api";

export interface UserStats {
  level: number;
  exp: number;
  currency: number;
  competence: number;
  tier: string;
  nextLevelXp: number;
  progressPercentage: number;
  currencyMultiplier: number;
}

export const useUserStats = (userId: string) => {
  const {
    data: stats,
    error,
    mutate,
  } = useSWR<UserStats>(
    userId ? "/user/stats" : null,
    (url) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: true },
  );

  return {
    stats: stats || {
      level: 1,
      exp: 0,
      currency: 0,
      competence: 0,
      tier: "Novice",
      nextLevelXp: 500,
      progressPercentage: 0,
      currencyMultiplier: 1,
    },
    isLoading: !stats && !error,
    error,
    revalidate: () => mutate(),
  };
};
