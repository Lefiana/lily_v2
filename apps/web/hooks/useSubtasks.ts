// hooks/useSubtasks.ts
"use client";

import { useSWRConfig } from 'swr';
import { api } from '@/lib/api';
import { ISubtask, ICreateSubtaskDto, IUpdateSubtaskDto, TaskStatus } from '@/types/task';
import { toast } from "sonner";

export const useSubtasks = (taskId: string) => {
  const { mutate } = useSWRConfig();
  const taskUrl = '/tasks'; // We mutate the main tasks list to reflect subtask changes

  const createSubtask = async (dto: ICreateSubtaskDto) => {
    try {
      await api.post(`/tasks/${taskId}/subtasks`, dto);
      mutate(taskUrl); // Refresh the task list to show the new subtask
      toast.success("Subtask added");
    } catch (err) {
      toast.error("Failed to add subtask");
    }
  };

  const updateSubtask = async (subtaskId: string, dto: IUpdateSubtaskDto) => {
    try {
      await api.patch(`/tasks/subtasks/${subtaskId}`, dto);
      mutate(taskUrl);
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const toggleSubtask = async (subtask: ISubtask) => {
    const newCompleted = !subtask.completed;
    
    // 1. Optimistically update the UI
    mutate(taskUrl, (currentTasks: any) => {
      return currentTasks.map((t: any) => {
        if (t.id === taskId) {
          return {
            ...t,
            subtask: t.subtask.map((s: any) => 
              s.id === subtask.id ? { ...s, completed: newCompleted } : s
            )
          };
        }
        return t;
      });
    }, false);

    // 2. Send request to backend
    try {
      await api.patch(`/tasks/subtasks/${subtask.id}`, {
        completed: newCompleted,
        status: newCompleted ? TaskStatus.COMPLETED : TaskStatus.TODO
      });
      // 3. Trigger a final revalidation to sync with server
      mutate(taskUrl);
    } catch (err) {
      mutate(taskUrl); // Rollback on error
      toast.error("Status update failed");
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    try {
      await api.delete(`/tasks/subtasks/${subtaskId}`);
      mutate(taskUrl);
      toast.info("Subtask removed");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  return {
    createSubtask,
    updateSubtask,
    toggleSubtask,
    deleteSubtask
  };
};