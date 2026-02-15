// apps/web/components/gamification/HabitTracker.tsx
"use client";

import { useHabits } from "@/hooks/useHabits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Circle, 
  Target, 
  Plus,
  Brain,
  Dumbbell,
  BookOpen,
  Sun,
  Moon,
  Coffee
} from "lucide-react";
import { useState } from "react";

interface HabitTrackerProps {
  userId: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  MINDFULNESS: <Brain className="h-4 w-4" />,
  EXERCISE: <Dumbbell className="h-4 w-4" />,
  LEARNING: <BookOpen className="h-4 w-4" />,
  MORNING: <Sun className="h-4 w-4" />,
  EVENING: <Moon className="h-4 w-4" />,
  PRODUCTIVITY: <Coffee className="h-4 w-4" />,
};

const difficultyColors: Record<string, string> = {
  BEGINNER: "bg-green-500/20 text-green-400 border-green-500/30",
  INTERMEDIATE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ADVANCED: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  EXPERT: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function HabitTracker({ userId }: HabitTrackerProps) {
  const { 
    suggestions, 
    todayHabits, 
    competence, 
    isLoading, 
    createHabit, 
    completeHabit 
  } = useHabits(userId);
  
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-400" />
          Habit Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Competence Progress */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <span className="font-medium text-white">Competence Score</span>
            </div>
            <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              {competence.tier}
            </Badge>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">{competence.currentScore} / {competence.maxScore}</span>
            <span className="text-zinc-400">{competence.percentage}%</span>
          </div>
          <Progress value={competence.percentage} className="h-2" />
        </div>

        {/* Today's Habits */}
        <div>
          <h4 className="text-sm font-medium text-zinc-300 mb-3">Today&apos;s Habits</h4>
          {todayHabits.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">No habits yet. Add one below!</p>
          ) : (
            <div className="space-y-2">
              {todayHabits.map((habit) => (
                <div
                  key={habit.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    habit.completed
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {habit.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-zinc-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${habit.completed ? "text-green-400 line-through" : "text-white"}`}>
                      {habit.customTitle || habit.category}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className="text-yellow-400">+{habit.currencyReward} crystals</span>
                      <span className="text-purple-400">+{habit.competenceGain} competence</span>
                    </div>
                  </div>
                  {!habit.completed && (
                    <Button
                      size="sm"
                      onClick={() => completeHabit(habit.id)}
                      className="shrink-0"
                    >
                      Complete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suggestions Toggle */}
        <Button
          variant="outline"
          className="w-full border-white/10 hover:bg-white/10"
          onClick={() => setShowSuggestions(!showSuggestions)}
        >
          <Plus className="h-4 w-4 mr-2" />
          {showSuggestions ? "Hide Suggestions" : "Add New Habit"}
        </Button>

        {/* Habit Suggestions */}
        {showSuggestions && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-zinc-300">Suggested Habits</h4>
            {suggestions.length === 0 ? (
              <p className="text-sm text-zinc-500">No suggestions available.</p>
            ) : (
              <div className="grid gap-2">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <div className="p-2 bg-white/5 rounded-lg">
                      {categoryIcons[suggestion.category] || <Target className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm">{suggestion.title}</p>
                      {suggestion.description && (
                        <p className="text-xs text-zinc-400 truncate">{suggestion.description}</p>
                      )}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${difficultyColors[suggestion.difficulty]}`}
                    >
                      {suggestion.difficulty}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => createHabit(suggestion.title, suggestion.id)}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
