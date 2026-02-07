// components/tasks/edit-task-modal.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  EditTaskModalProps,
  IUpdateTaskDto,
  TaskStatus,
  TaskCategory,
} from "../../types/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryFilter } from "./category-filter";

export function EditTaskModal({
  task,
  isOpen,
  onClose,
  onSave,
}: EditTaskModalProps) {
  const [formData, setFormData] = useState<IUpdateTaskDto>({
    title: "",
    description: "",
    status: TaskStatus.TODO,
    category: TaskCategory.TASK,
  });

  // Sync state when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        status: task.status,
        category: task.category || TaskCategory.TASK,
      });
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;
    await onSave(task.id, formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-purple-500/30 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-xl font-black text-purple-400">
            Edit Quest Details
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Modify the core parameters of this objective.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* TITLE */}
          <div className="space-y-2">
            <Label
              htmlFor="title"
              className="text-[10px] uppercase font-bold text-zinc-500 tracking-tighter"
            >
              Quest Name
            </Label>
            <Input
              id="title"
              className="bg-black/40 border-purple-500/30 text-zinc-100 focus:border-purple-500/50 focus:ring-purple-500/20"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g. Slay the Dragon"
            />
          </div>

          {/* CATEGORY SELECT */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-tighter">
              Category
            </Label>
            <CategoryFilter
              value={formData.category}
              onChange={(cat) =>
                setFormData({ ...formData, category: cat || TaskCategory.TASK })
              }
            />
          </div>

          {/* STATUS SELECT */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-tighter">
              Quest Status
            </Label>
            <Select
              value={formData.status}
              onValueChange={(val: TaskStatus) =>
                setFormData({ ...formData, status: val })
              }
            >
              <SelectTrigger className="bg-black/40 border-purple-500/30 text-zinc-100 focus:border-purple-500/50">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-purple-500/30">
                <SelectItem
                  value={TaskStatus.TODO}
                  className="text-zinc-300 focus:bg-purple-500/10"
                >
                  To Do
                </SelectItem>
                <SelectItem
                  value={TaskStatus.IN_PROGRESS}
                  className="text-zinc-300 focus:bg-purple-500/10"
                >
                  In Progress
                </SelectItem>
                <SelectItem
                  value={TaskStatus.COMPLETED}
                  className="text-zinc-300 focus:bg-purple-500/10"
                >
                  Completed
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-2">
            <Label
              htmlFor="desc"
              className="text-[10px] uppercase font-bold text-zinc-500 tracking-tighter"
            >
              Lore / Description
            </Label>
            <Textarea
              id="desc"
              rows={4}
              className="bg-black/40 border-purple-500/30 text-zinc-100 focus:border-purple-500/50 focus:ring-purple-500/20 resize-none"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe the quest details..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-zinc-500 hover:text-white"
          >
            Abandon Changes
          </Button>
          <Button
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 font-bold italic uppercase"
          >
            Update Quest
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
