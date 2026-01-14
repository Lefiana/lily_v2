// apps/web/hooks/useTasks.ts
"use client";

import useSWR from 'swr';
import { api } from '@/lib/api';
import { useTaskSocket } from './use-tasks.socket';
import { ITask, TaskStatus, IUpdateTaskDto, ITaskWithSubtasks } from '@/types/task';
import { toast } from "sonner"; // Recommended Shadcn toast

const fetcher = async (url: string) => {
  console.log("SWR: Fetching tasks from:", url);
  try {
    const response = await api.get(url);
    console.log("SWR: Successfully fetched tasks:", response.data);
    return response.data;
  } catch (err: any) {
  console.error("Status:", err.response?.status);
  console.error("Response Data:", JSON.stringify(err.response?.data, null, 2));
  console.error("Cookie Sent:", err.config?.withCredentials); // Check if cookies were sent
    toast.error("Failed to load quests.");
    throw err;
  }
};

export const useTasks = (userId: string) => {
  const { data: tasks, error, isLoading, mutate } = useSWR<ITaskWithSubtasks[]>('/tasks', fetcher);
  userId ? '/tasks' : null; // Conditional fetch
  fetcher;
  // Enable Real-time listener
  useTaskSocket(userId);

  /**
   * CREATE TASK
   */
  const createTask = async (title: string, description?: string) => {
    const optimisticTask: ITaskWithSubtasks = {
      id: `temp-${Date.now()}`,
      title,
      description: description || null,
      completed: false,
      status: TaskStatus.TODO,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
      subtask: [],
      TaskAttachment: [],
      recurrence: null,
    };

    mutate([optimisticTask, ...(tasks || [])], false);

    try {
      await api.post('/tasks', { title, description });
      toast.success("Quest started!");
    } catch (err) {
      mutate(); // Rollback
      toast.error("Failed to create quest.");
    }
  };

  /**
   * UPDATE TASK (Used for titles, descriptions, status changes)
   */
  const updateTask = async (id: string, updateDto: IUpdateTaskDto) => {
    const currentTasks = tasks || [];
    const updatedTasks = currentTasks.map((t) =>
      t.id === id ? { ...t, ...updateDto } : t
    );

    mutate(updatedTasks, false);

    try {
      await api.patch(`/tasks/${id}`, updateDto);
    } catch (err) {
      mutate();
      toast.error("Update failed.");
    }
  };

  /**
   * TOGGLE COMPLETION
   * Separate logic because this often triggers rewards/Gacha later
   */
  const toggleComplete = async (id: string, completed: boolean) => {
    // Optimistic update
    mutate(
      tasks?.map((t) => (t.id === id ? { ...t, completed } : t)),
      false
    );

    try {
      await api.patch(`/tasks/${id}`, { completed });
      if (completed) toast.success("Quest Completed! +Exp");
    } catch (err) {
      mutate();
      toast.error("Failed to update status.");
    }
  };

  /**
   * DELETE TASK
   */
  const deleteTask = async (id: string) => {
    mutate(tasks?.filter((t) => t.id !== id), false);
    try {
      await api.delete(`/tasks/${id}`);
      toast.info("Quest abandoned.");
    } catch (err) {
      mutate();
      toast.error("Could not delete quest.");
    }
  };

  return {
    tasks: tasks || [],
    isLoading,
    error,
    createTask,
    updateTask,
    toggleComplete,
    deleteTask,
    revalidate: () => mutate(),
  };
};