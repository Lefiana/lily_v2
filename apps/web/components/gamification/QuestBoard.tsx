// apps/web/components/gamification/QuestBoard.tsx
"use client";

import { useQuests } from "@/hooks/useQuests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

interface QuestBoardProps {
  userId: string;
}

export function QuestBoard({ userId }: QuestBoardProps) {
  const { quests, completedCount, isLoading, completeQuest } =
    useQuests(userId);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-white/10 rounded w-1/3" />
            <div className="h-20 bg-white/10 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = (completedCount / 5) * 100;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-400" />
          Daily Quests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">Progress</span>
            <span className="text-white">{completedCount}/5</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-3">
          {quests.map((quest) => (
            <div
              key={quest.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                quest.completed
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              {quest.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-zinc-500 mt-0.5 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <h4
                  className={`font-medium ${quest.completed ? "text-green-400 line-through" : "text-white"}`}
                >
                  {quest.title}
                </h4>
                {quest.description && (
                  <p className="text-sm text-zinc-400 mt-1">
                    {quest.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="text-yellow-400">
                    +{quest.currencyReward} crystals
                  </span>
                  <span className="text-blue-400">+{quest.expReward} XP</span>
                </div>
              </div>

              {!quest.completed && (
                <Button
                  size="sm"
                  onClick={() => completeQuest(quest.id)}
                  className="shrink-0"
                >
                  Complete
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
