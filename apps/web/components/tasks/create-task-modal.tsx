"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // add via shadcn if missing
import { useTasks } from "@/hooks/useTasks";
import { Plus } from "lucide-react";

export function CreateTaskModal({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { createTask } = useTasks(userId);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await createTask(title, description);
    setTitle("");
    setDescription("");
    setOpen(false); // Close modal on success
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
          <Plus className="h-4 w-4" /> New Quest
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-none text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tighter">
            START NEW ADVENTURE
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-xs uppercase text-zinc-500 font-bold">Quest Title</label>
            <Input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Defeat the bug in Production" 
              className="glass-input"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase text-zinc-500 font-bold">Details</label>
            <Textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done?" 
              className="glass-input min-h-[100px] bg-white/5 border-white/10 text-white"
            />
          </div>
          <Button type="submit" className="w-full h-12 mt-4">
            Begin Quest
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}