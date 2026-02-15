// apps/web/app/(dashboard)/gacha/page.tsx
"use client";

import { authClient } from "@/lib/auth-client";
import { UserStatsBar } from "@/components/gamification/UserStatsBar";
import { QuestBoard } from "@/components/gamification/QuestBoard";
import { HabitTracker } from "@/components/gamification/HabitTracker";
import { GachaSystem } from "@/components/gamification/GachaSystem";
import { Sparkles, Target, Gift } from "lucide-react";

export default function GachaPage() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || "";

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-yellow-400" />
          <h2 className="text-3xl font-bold tracking-tight text-white uppercase">
            Gamification Hub
          </h2>
        </div>
        <p className="text-zinc-400 mt-2">
          Complete quests, build habits, and collect rewards!
        </p>
      </div>

      {/* User Stats Bar */}
      <UserStatsBar userId={userId} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quest Board */}
        <div>
          <QuestBoard userId={userId} />
        </div>

        {/* Habit Tracker */}
        <div>
          <HabitTracker userId={userId} />
        </div>
      </div>

      {/* Gacha System - Full Width */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Gift className="h-6 w-6 text-pink-400" />
          <h3 className="text-xl font-bold text-white">Gacha Collection</h3>
        </div>
        <GachaSystem userId={userId} />
      </div>

      {/* Tips Section */}
      <div className="glass-card p-6 rounded-xl">
        <div className="flex items-start gap-3">
          <Target className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-white mb-1">How it works</h4>
            <ul className="text-sm text-zinc-400 space-y-1">
              <li>• Complete daily quests to earn crystals and XP</li>
              <li>• Build habits to increase your competence score</li>
              <li>• Use crystals to pull from gacha pools and collect items</li>
              <li>• Level up to increase your currency multiplier</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
