// apps/web/hooks/useQuests.ts
"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface DailyQuest {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completedAt: string | null;
  currencyReward: number;
  expReward: number;
  questNumber: number;
}

export interface QuestCompletionResult {
  quest: DailyQuest;
  rewards: { currency: number; exp: number };
  leveledUp: boolean;
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export const useQuests = (userId: string) => {
  const endpoint = "/quests/daily";

  const {
    data: quests,
    error,
    isLoading,
    mutate,
  } = useSWR<DailyQuest[]>(userId ? endpoint : null, fetcher, {
    revalidateOnFocus: true,
  });

  const completeQuest = async (questId: string) => {
    try {
      const response = await api.post<QuestCompletionResult>(
        `/quests/daily/${questId}/complete`,
        { questId },
      );

      // Optimistic update
      mutate(
        (current) =>
          current?.map((q) =>
            q.id === questId
              ? { ...q, completed: true, completedAt: new Date().toISOString() }
              : q,
          ),
        false,
      );

      toast.success(
        `Quest completed! +${response.data.rewards.currency} crystals`,
      );

      if (response.data.leveledUp) {
        toast.success("Level Up! Your power grows...");
      }

      return response.data;
    } catch (err) {
      toast.error("Failed to complete quest");
      throw err;
    }
  };

  const regenerateQuests = async () => {
    try {
      await api.post("/quests/daily/regenerate");
      mutate();
      toast.success("New quests generated!");
    } catch (err) {
      toast.error("Failed to regenerate quests");
      throw err;
    }
  };

  const completedCount = quests?.filter((q) => q.completed).length || 0;
  const totalReward =
    quests?.reduce((sum, q) => sum + (q.completed ? q.currencyReward : 0), 0) ||
    0;

  return {
    quests: quests || [],
    isLoading,
    error,
    completedCount,
    totalReward,
    completeQuest,
    regenerateQuests,
    revalidate: () => mutate(),
  };
};
