// apps/web/components/gamification/UserStatsBar.tsx
"use client";

import { useUserStats } from "@/hooks/useUserStats";
import { Progress } from "@/components/ui/progress";
import { Gem, Sparkles, TrendingUp, Zap } from "lucide-react";

interface UserStatsBarProps {
  userId: string;
}

export function UserStatsBar({ userId }: UserStatsBarProps) {
  const { stats, isLoading } = useUserStats(userId);

  if (isLoading) {
    return (
      <div className="glass-card p-4 rounded-xl">
        <div className="animate-pulse flex gap-6">
          <div className="h-8 bg-white/10 rounded w-24" />
          <div className="h-8 bg-white/10 rounded w-24" />
          <div className="h-8 bg-white/10 rounded w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 rounded-xl">
      <div className="flex flex-wrap items-center gap-6">
        {/* Currency */}
        <div className="flex items-center gap-2">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Gem className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wide">
              Crystals
            </p>
            <p className="text-lg font-bold text-yellow-400">
              {stats.currency.toLocaleString()}
              {stats.currencyMultiplier > 1 && (
                <span className="text-sm text-green-400 ml-1">
                  x{stats.currencyMultiplier}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Level */}
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <TrendingUp className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wide">
              Level
            </p>
            <p className="text-lg font-bold text-blue-400">
              {stats.level}{" "}
              <span className="text-sm text-zinc-500">({stats.tier})</span>
            </p>
          </div>
        </div>

        {/* XP Progress */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-zinc-400 uppercase tracking-wide">
                XP Progress
              </span>
            </div>
            <span className="text-xs text-zinc-400">
              {stats.exp} / {stats.nextLevelXp}
            </span>
          </div>
          <Progress value={stats.progressPercentage} className="h-2" />
        </div>

        {/* Multiplier */}
        {stats.currencyMultiplier > 1 && (
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Zap className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wide">
                Multiplier
              </p>
              <p className="text-lg font-bold text-green-400">
                x{stats.currencyMultiplier}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
