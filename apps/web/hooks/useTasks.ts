// apps/web/hooks/useTasks.ts
"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useTaskSocket } from "./use-tasks.socket";
import {
  TaskStatus,
  TaskCategory,
  IUpdateTaskDto,
  ITaskWithSubtasks,
} from "@/types/task";
import { toast } from "sonner";

// Options interface for useTasks hook
export interface UseTasksOptions {
  enableClientFilter?: boolean;
}

const fetcher = async (url: string) => {
  console.log("SWR: Fetching tasks from:", url);
  try {
    const response = await api.get(url);
    console.log("SWR: Successfully fetched tasks:", response.data);
    return response.data;
  } catch (err: any) {
    console.error("Status:", err.response?.status);
    console.error(
      "Response Data:",
      JSON.stringify(err.response?.data, null, 2),
    );
    console.error("Cookie Sent:", err.config?.withCredentials);
    toast.error("Failed to load quests.");
    throw err;
  }
};

export const useTasks = (
  userId: string,
  category?: TaskCategory,
  query?: string,
  options?: UseTasksOptions,
) => {
  // Build base endpoint (without query for client-side filtering)
  const queryParams = new URLSearchParams();
  if (category) queryParams.append("category", category);

  // Only add query to API call if client filter is disabled
  const shouldFetchAll = options?.enableClientFilter;
  if (query && !shouldFetchAll) {
    queryParams.append("q", query);
  }

  const queryString = queryParams.toString();
  const endpoint = `/tasks${queryString ? `?${queryString}` : ""}`;

  const {
    data: allTasks,
    error,
    isLoading,
    mutate,
  } = useSWR<ITaskWithSubtasks[]>(userId ? endpoint : null, fetcher, {
    // SWR Configuration for better UX
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 0, // No polling, rely on socket
  });

  // Enable Real-time listener
  useTaskSocket(userId, {
    invalidateKeys: [endpoint],
    events: [
      "task_created",
      "task_updated",
      "task_deleted",
      "attachment_added",
      "attachment_deleted",
    ],
  });

  // Client-side filtering for instant search
  const filteredTasks = useMemo(() => {
    if (!allTasks || !query || !options?.enableClientFilter) {
      return allTasks || [];
    }

    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return allTasks || [];

    return allTasks.filter((task) => {
      const titleMatch = task.title.toLowerCase().includes(lowerQuery);
      const descMatch = task.description?.toLowerCase().includes(lowerQuery);
      const categoryMatch = task.category?.toLowerCase().includes(lowerQuery);
      return titleMatch || descMatch || categoryMatch;
    });
  }, [allTasks, query, options?.enableClientFilter]);

  // Return filtered or all tasks based on option
  const tasks = options?.enableClientFilter ? filteredTasks : allTasks || [];

  /**
   * CREATE TASK
   */
  const createTask = async (
    title: string,
    description?: string,
    taskCategory?: TaskCategory,
  ) => {
    const optimisticTask: ITaskWithSubtasks = {
      id: `temp-${Date.now()}`,
      title,
      description: description || null,
      completed: false,
      status: TaskStatus.TODO,
      category: taskCategory || TaskCategory.TASK,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
      subtask: [],
      TaskAttachment: [],
      recurrence: null,
    };

    mutate([optimisticTask, ...(allTasks || [])], false);

    try {
      await api.post("/tasks", {
        title,
        description,
        category: taskCategory || TaskCategory.TASK,
      });
      toast.success("Quest started!");
    } catch (err) {
      mutate();
      toast.error("Failed to create quest.");
    }
  };

  /**
   * UPDATE TASK
   */
  const updateTask = async (id: string, updateDto: IUpdateTaskDto) => {
    const currentTasks = allTasks || [];
    const updatedTasks = currentTasks.map((t) =>
      t.id === id ? { ...t, ...updateDto } : t,
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
   */
  const toggleComplete = async (id: string, completed: boolean) => {
    mutate(
      allTasks?.map((t) => (t.id === id ? { ...t, completed } : t)),
      false,
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
    mutate(
      allTasks?.filter((t) => t.id !== id),
      false,
    );
    try {
      await api.delete(`/tasks/${id}`);
      toast.info("Quest abandoned.");
    } catch (err) {
      mutate();
      toast.error("Could not delete quest.");
    }
  };

  return {
    tasks,
    allTasks: allTasks || [], // Expose all tasks for filtering info
    isLoading,
    error,
    createTask,
    updateTask,
    toggleComplete,
    deleteTask,
    revalidate: () => mutate(),
  };
};

// Hook for inventory
export const useInventory = (userId: string, category?: TaskCategory) => {
  const queryParams = new URLSearchParams();
  if (category) queryParams.append("category", category);

  const queryString = queryParams.toString();
  const endpoint = `/tasks/inventory${queryString ? `?${queryString}` : ""}`;

  const {
    data: tasks,
    error,
    isLoading,
    mutate,
  } = useSWR<ITaskWithSubtasks[]>(userId ? endpoint : null, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  // Enable Real-time listener for inventory
  useTaskSocket(userId, {
    invalidateKeys: [endpoint],
    events: [
      "attachment_added",
      "attachment_deleted",
      "task_updated",
      "task_deleted",
    ],
  });

  return {
    tasks: tasks || [],
    isLoading,
    error,
    revalidate: () => mutate(),
  };
};
