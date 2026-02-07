"use client";

import { TaskCategory } from "@/types/task";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Folder, Package, Scroll, Archive } from "lucide-react";

interface CategoryFilterProps {
  value?: TaskCategory;
  onChange: (category: TaskCategory | undefined) => void;
}

const categoryIcons = {
  [TaskCategory.TASK]: Folder,
  [TaskCategory.ITEM]: Package,
  [TaskCategory.LOG]: Scroll,
  [TaskCategory.ARCHIVE]: Archive,
};

const categoryLabels = {
  [TaskCategory.TASK]: "Tasks",
  [TaskCategory.ITEM]: "Items",
  [TaskCategory.LOG]: "Logs",
  [TaskCategory.ARCHIVE]: "Archive",
};

const categoryColors = {
  [TaskCategory.TASK]: "text-purple-400",
  [TaskCategory.ITEM]: "text-purple-300",
  [TaskCategory.LOG]: "text-zinc-400",
  [TaskCategory.ARCHIVE]: "text-zinc-500",
};

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <Select
      value={value || "all"}
      onValueChange={(val) =>
        onChange(val === "all" ? undefined : (val as TaskCategory))
      }
    >
      <SelectTrigger className="w-[180px] bg-black/40 border-purple-500/30 text-zinc-300 hover:border-purple-500/50 focus:ring-purple-500/20">
        <SelectValue placeholder="All Categories" />
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 border-purple-500/30">
        <SelectItem
          value="all"
          className="text-zinc-300 focus:bg-purple-500/10 focus:text-zinc-100"
        >
          All Categories
        </SelectItem>
        {Object.values(TaskCategory).map((category) => {
          const Icon = categoryIcons[category];
          const colorClass = categoryColors[category];
          return (
            <SelectItem
              key={category}
              value={category}
              className="text-zinc-300 focus:bg-purple-500/10 focus:text-zinc-100"
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${colorClass}`} />
                <span>{categoryLabels[category]}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
