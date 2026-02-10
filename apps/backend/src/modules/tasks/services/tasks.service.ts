// apps/backend/src/modules/tasks/services/tasks.service.ts
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { TasksRepository } from '../repositories/tasks.repository';
import { TasksGateway } from '../gateways/tasks.gateway';
import {
  CreateTaskDto,
  UpdateTaskDto,
  UpdateSubtaskDto,
} from '../domain/task.dto';
import {
  TaskEvents,
  ISubtaskAddedPayload,
  ITaskAttachment,
} from '../domain/task.types';
import * as fs from 'fs/promises';
import { join } from 'path';
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly repo: TasksRepository,
    private readonly gateway: TasksGateway,
  ) {}

  /**
   * Centralized error handler (No 'any')
   */
  private handleError(error: unknown, context: string): never {
    if (error instanceof NotFoundException) throw error;

    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`${context}: ${message}`);
    throw new InternalServerErrorException(context);
  }

  async create(dto: CreateTaskDto, userId: string) {
    try {
      this.logger.debug(`Creating task for user: ${userId}`);
      const task = await this.repo.create(dto, userId);
      // Real-time hook
      this.gateway.emitToUser(userId, TaskEvents.TASK_CREATED, task);
      return task;
    } catch (error) {
      this.handleError(error, 'Error creating task');
    }
  }

  // === file attachments ====
  async uploadFile(taskId: string, userId: string, file: Express.Multer.File) {
    try {
      // 1. Ownership check
      await this.findOne(taskId, userId);

      // 2. Save to Database
      const attachment = await this.repo.addAttachment(taskId, {
        filename: file.originalname,
        filepath: `/uploads/${file.filename}`, // The path to access the file
        mimetype: file.mimetype,
        size: file.size,
      });

      // 3. REAL-TIME BROADCAST
      // Tell the frontend a new file is available for this task
      this.gateway.emitToUser(userId, 'attachment_added', {
        taskId,
        attachment,
      });

      return attachment;
    } catch (error) {
      this.handleError(error, 'File upload failed');
    }
  }
  async removeAttachment(attachmentId: string, userId: string) {
    try {
      // 1. Find the attachment and check ownership via the Task
      const attachment = await this.repo.findAttachmentById(attachmentId);
      if (!attachment) throw new NotFoundException('Attachment not found');

      const task = await this.repo.findById(attachment.taskId, userId);
      if (!task) throw new NotFoundException('Unauthorized or task not found');

      // 2. Delete from Database
      await this.repo.deleteAttachment(attachmentId);

      // 3. Delete physical file
      // attachment.filepath is "/uploads/file-123.jpg"
      // We need to map it to the actual disk path
      const fileName = attachment.filepath.replace('/uploads/', '');
      const fullPath = join(process.cwd(), 'uploads', fileName);

      try {
        await fs.unlink(fullPath);
        this.logger.log(`Deleted file: ${fullPath}`);
      } catch (fileErr) {
        // We log but don't crash if the file was already missing
        this.logger.warn(
          `File not found on disk, but DB record deleted: ${fullPath}`,
        );
      }

      // 4. REAL-TIME BROADCAST
      this.gateway.emitToUser(userId, 'attachment_deleted', {
        taskId: attachment.taskId,
        attachmentId: attachment.id,
      });

      return { success: true };
    } catch (error) {
      this.handleError(error, 'Could not delete attachment');
    }
  }
  async uploadMultipleFiles(
    taskId: string,
    userId: string,
    files: Express.Multer.File[],
  ) {
    try {
      await this.findOne(taskId, userId);

      // 1. Explicitly type the array using your Domain Interface
      const results: ITaskAttachment[] = [];

      for (const file of files) {
        const attachment = await this.repo.addAttachment(taskId, {
          filename: file.originalname,
          filepath: `/uploads/${file.filename}`,
          mimetype: file.mimetype,
          size: file.size,
        });

        this.gateway.emitToUser(userId, 'attachment_added', {
          taskId,
          attachment,
        });

        results.push(attachment); // Now this is allowed!
      }

      return results;
    } catch (error) {
      this.handleError(error, 'Bulk upload failed');
    }
  }

  async getAttachmentForDownload(attachmentId: string, userId: string) {
    try {
      const attachment = await this.repo.findAttachmentById(attachmentId);
      if (!attachment) throw new NotFoundException('Attachment not found');

      const task = await this.repo.findById(attachment.taskId, userId);
      if (!task) throw new NotFoundException('Unauthorized or task not found');

      return attachment;
    } catch (error) {
      this.handleError(error, 'Could not get attachment for download');
    }
  }
  async findAll(userId: string, query?: string, category?: any) {
    try {
      return await this.repo.findAll(userId, { query, category });
    } catch (error) {
      this.handleError(error, 'Error fetching tasks');
    }
  }

  async findAllForInventory(userId: string, category?: any) {
    try {
      return await this.repo.findAllWithAttachments(userId, { category });
    } catch (error) {
      this.handleError(error, 'Error fetching inventory');
    }
  }

  async findOne(id: string, userId: string) {
    try {
      const task = await this.repo.findById(id, userId);
      if (!task) throw new NotFoundException(`Task with ID ${id} not found`);
      return task;
    } catch (error) {
      this.handleError(error, 'Error retrieving task');
    }
  }

  async update(id: string, dto: UpdateTaskDto, userId: string) {
    try {
      await this.findOne(id, userId); // Ensure ownership
      const updated = await this.repo.update(id, dto);

      this.gateway.emitToUser(userId, TaskEvents.TASK_UPDATED, updated);
      return updated;
    } catch (error) {
      this.handleError(error, 'Could not update task');
    }
  }

  async remove(id: string, userId: string) {
    try {
      await this.findOne(id, userId);
      await this.repo.delete(id);

      this.gateway.emitToUser(userId, TaskEvents.TASK_DELETED, { id });
      return { success: true };
    } catch (error) {
      this.handleError(error, 'Could not delete task');
    }
  }

  // --- Subtask Actions ---

  async addSubtask(taskId: string, title: string, userId: string) {
    try {
      await this.findOne(taskId, userId);
      const subtask = await this.repo.addSubtask(taskId, title);

      this.gateway.emitToUser(userId, TaskEvents.SUBTASK_ADDED, {
        taskId,
        subtask,
      });
      return subtask;
    } catch (error) {
      this.handleError(error, 'Could not add subtask');
    }
  }

  async updateSubtask(
    subtaskId: string,
    dto: UpdateSubtaskDto,
    userId: string,
  ) {
    try {
      const subtask = await this.repo.findSubtaskWithTask(subtaskId);
      if (!subtask || subtask.Task.userId !== userId) {
        throw new NotFoundException('Subtask not found or unauthorized');
      }

      const updated = await this.repo.updateSubtask(subtaskId, dto);
      this.gateway.emitToUser(userId, TaskEvents.SUBTASK_UPDATED, updated);
      return updated;
    } catch (error) {
      this.handleError(error, 'Could not update subtask');
    }
  }

  async deleteSubtask(subtaskId: string, userId: string) {
    try {
      const subtask = await this.repo.findSubtaskWithTask(subtaskId);
      if (!subtask || subtask.Task.userId !== userId) {
        throw new NotFoundException('Subtask not found');
      }

      await this.repo.deleteSubtask(subtaskId);
      this.gateway.emitToUser(userId, TaskEvents.SUBTASK_DELETED, {
        id: subtaskId,
      });
      return { success: true };
    } catch (error) {
      this.handleError(error, 'Could not delete subtask');
    }
  }
}
