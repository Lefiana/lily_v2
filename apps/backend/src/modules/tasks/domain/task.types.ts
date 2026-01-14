// apps/backend/src/modules/tasks/domain/task.types.ts
import { TaskStatus } from "@prisma/client";

export { TaskStatus};

export enum TaskEvents {
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_DELETED = 'task_deleted',
  SUBTASK_ADDED = 'subtask_added',
  SUBTASK_UPDATED = 'subtask_updated',
  SUBTASK_DELETED = 'subtask_deleted',
}

export interface ISubtask {
    id: string;
    title: string;
    description?: string | null;
    status: TaskStatus;
    completed: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
    taskId: string;
}

export interface ITask {
    id: string;
    title: string;
    description?: string | null;
    completed: boolean;
    status: TaskStatus;
    priority?: string | null;
    dueDate?: Date | string | null;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    recurrence: string | null;
}

export interface ITaskAttachment {
  id: string;
  filename: string;
  filepath: string; // This will be the URL or local path
  mimetype: string;
  size: number;
  taskId: string;
  createdAt: Date;
}
export interface ICreateTaskDto {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: string;
    dueDate?: Date | string | null;
    subtasks?: ICreateSubtaskDto[];
}

export interface IUpdateTaskDto {
    title?: string;
    description?: string;
    completed?: boolean;
    status?: TaskStatus;
    priority?: string;
    dueDate?: Date | string | null;
}

export interface ICreateSubtaskDto {
    title: string;
    description?: string;
    status?: TaskStatus;
    order?: number;
}

export interface IUpdateSubtaskDto {
    title?: string;
    description?: string;
    status?: TaskStatus;
    completed?: boolean;
    order?: number;
}

export interface ITaskWithSubtasks extends ITask {
  subtask: ISubtask[];
  attachments: ITaskAttachment[];
}

// Define specific payloads for complex events
export interface ISubtaskAddedPayload {
  taskId: string;
  subtask: ISubtask;
}

export interface ITaskDeletedPayload {
  id: string;
}

export interface IAttachmentDeletedPayload {
  taskId: string;
  attachmentId: string;
}

// The "Master" type for any data sent over the Task WebSocket
export type TaskEventPayload = 
  | ITask 
  | ISubtask 
  | ISubtaskAddedPayload 
  | ITaskDeletedPayload
  | { taskId: string; attachment: ITaskAttachment }
  | IAttachmentDeletedPayload
  | { success: boolean }; // For simple acknowledgments