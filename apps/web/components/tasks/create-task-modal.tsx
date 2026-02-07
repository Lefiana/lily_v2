"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTasks } from "@/hooks/useTasks";
import { Plus } from "lucide-react";
import { TaskCategory } from "@/types/task";
import { CategoryFilter } from "./category-filter";

interface CreateTaskModalProps {
  userId: string;
}

export function CreateTaskModal({ userId }: CreateTaskModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TaskCategory>(TaskCategory.TASK);
  const { createTask } = useTasks(userId);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await createTask(title, description, category);
    setTitle("");
    setDescription("");
    setCategory(TaskCategory.TASK);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-purple-600 hover:bg-purple-700 shadow-[0_0_20px_rgba(147,51,234,0.5)]">
          <Plus className="h-4 w-4" /> New Quest
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-purple-500/30 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tighter text-purple-400">
            START NEW ADVENTURE
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-xs uppercase text-zinc-500 font-bold">
              Quest Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Defeat the bug in Production"
              className="bg-black/40 border-purple-500/30 text-zinc-100 focus:border-purple-500/50 focus:ring-purple-500/20"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase text-zinc-500 font-bold">
              Category
            </label>
            <CategoryFilter
              value={category}
              onChange={(cat) => setCategory(cat || TaskCategory.TASK)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase text-zinc-500 font-bold">
              Details
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done?"
              className="bg-black/40 border-purple-500/30 text-zinc-100 min-h-[100px] focus:border-purple-500/50 focus:ring-purple-500/20"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-12 mt-4 bg-purple-600 hover:bg-purple-700"
          >
            Begin Quest
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
