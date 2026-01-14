// components/tasks/edit-task-modal.tsx
"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { EditTaskModalProps, IUpdateTaskDto, TaskStatus } from "../../types/task"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea" // Assuming you have this Shadcn component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function EditTaskModal({ task, isOpen, onClose, onSave }: EditTaskModalProps) {
  const [formData, setFormData] = useState<IUpdateTaskDto>({
    title: "",
    description: "",
    status: TaskStatus.TODO,
  })

  // Sync state when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        status: task.status,
      })
    }
  }, [task])

  const handleSave = async () => {
    if (!task) return
    await onSave(task.id, formData)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-xl font-black text-blue-500">
            Edit Quest Details
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Modify the core parameters of this objective.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* TITLE */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-[10px] uppercase font-bold text-zinc-500 tracking-tighter">Quest Name</Label>
            <Input 
              id="title"
              className="bg-zinc-800/50 border-zinc-700 focus:ring-blue-500"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Slay the Dragon"
            />
          </div>

          {/* STATUS SELECT */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-tighter">Quest Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(val: TaskStatus) => setFormData({ ...formData, status: val })}
            >
              <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                <SelectItem value={TaskStatus.TODO}>To Do</SelectItem>
                <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                <SelectItem value={TaskStatus.COMPLETED}>Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-2">
            <Label htmlFor="desc" className="text-[10px] uppercase font-bold text-zinc-500 tracking-tighter">Lore / Description</Label>
            <Textarea 
              id="desc"
              rows={4}
              className="bg-zinc-800/50 border-zinc-700 focus:ring-blue-500 resize-none"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the quest details..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <Button variant="ghost" onClick={onClose} className="text-zinc-500 hover:text-white">
            Abandon Changes
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-8 font-bold italic uppercase">
            Update Quest
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}