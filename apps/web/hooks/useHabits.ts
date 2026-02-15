// apps/web/hooks/useHabits.ts
"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface HabitSuggestion {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
}

export interface HabitEntry {
  id: string;
  templateId: string | null;
  customTitle: string | null;
  completed: boolean;
  category: string;
  currencyReward: number;
  expReward: number;
  competenceGain: number;
}

export interface CompetenceProgress {
  currentScore: number;
  maxScore: number;
  percentage: number;
  tier: string;
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export const useHabits = (userId: string) => {
  const { data: suggestions, mutate: mutateSuggestions } = useSWR<HabitSuggestion[]>(
    userId ? "/habits/suggestions" : null,
    fetcher,
  );

  const { data: todayHabits, mutate: mutateToday } = useSWR<HabitEntry[]>(
    userId ? "/habits/today" : null,
    fetcher,
  );

  const { data: competence } = useSWR<CompetenceProgress>(
    userId ? "/habits/competence" : null,
    fetcher,
  );

  const createHabit = async (title: string, templateId?: string) => {
    try {
      await api.post("/habits", { title, templateId });
      mutateToday();
      toast.success("Habit created!");
    } catch (err) {
      toast.error("Failed to create habit");
      throw err;
    }
  };

  const completeHabit = async (habitId: string) => {
    try {
      const response = await api.post(`/habits/${habitId}/complete`, {
        habitId,
      });
      mutateToday();
      toast.success(
        `Habit completed! +${response.data.rewards.competence} competence`,
      );
      return response.data;
    } catch (err) {
      toast.error("Failed to complete habit");
      throw err;
    }
  };

  return {
    suggestions: suggestions || [],
    todayHabits: todayHabits || [],
    competence: competence || {
      currentScore: 0,
      maxScore: 100,
      percentage: 0,
      tier: "Beginner",
    },
    isLoading: !suggestions && !todayHabits && !competence,
    createHabit,
    completeHabit,
    revalidate: () => {
      mutateSuggestions();
      mutateToday();
    },
  };
};
