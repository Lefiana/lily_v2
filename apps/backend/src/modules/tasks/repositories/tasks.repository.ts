// apps/backend/src/modules/tasks/repositories/tasks.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateTaskDto, UpdateTaskDto, UpdateSubtaskDto } from '../domain/task.dto';
import { randomUUID } from 'crypto';
import { ITaskAttachment } from '../domain';
// Helper for consistent includes across all methods
const taskInclude = {
  subtask: true,
  TaskAttachment: true,
} as const;

@Injectable()
export class TasksRepository {
  private readonly logger = new Logger(TasksRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTaskDto, userId: string) {
    const { subtasks, ...taskData } = dto;
    return this.prisma.task.create({
      data: {
        ...taskData,
        userId,
        subtask: subtasks?.length ? {
          create: subtasks.map(s => ({ title: s.title }))
        } : undefined,
      },
      include: taskInclude,
    });
  }

  async addAttachment(taskId: string, fileData: any) {
    return await this.prisma.taskAttachment.create({
        data: {
        id: randomUUID(),
        ...fileData,
        taskId,
        },
    }) as ITaskAttachment;
    }

    async findAttachmentById(id: string) {
    return await this.prisma.taskAttachment.findUnique({
        where: { id },
    });
    }

    async deleteAttachment(id: string) {
    return await this.prisma.taskAttachment.delete({
        where: { id },
    });
    }
  async findAll(userId: string, filters?: { status?: any; query?: string }) {
    const where: Prisma.TaskWhereInput = {
      userId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.query && {
        OR: [
          { title: { contains: filters.query, mode: 'insensitive' } },
          { description: { contains: filters.query, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    return this.prisma.task.findFirst({
      where: { id, userId },
      include: taskInclude,
    });
  }

    async update(id: string, dto: UpdateTaskDto) {
    // 1. Pull subtasks out so they don't break the main task update
    const { subtasks, ...taskData } = dto;

    return this.prisma.task.update({
        where: { id },
        data: {
        ...taskData,
        // 2. If you want to support updating subtasks via the main Task update:
        // This is the Prisma way to handle nested updates:
        ...(subtasks && {
            subtask: {
            deleteMany: {}, // Optional: clears old subtasks and replaces with new ones
            create: subtasks.map(s => ({ title: s.title }))
            }
        })
        },
        include: taskInclude,
    });
    }

  async delete(id: string) {
    return this.prisma.task.delete({
      where: { id },
    });
  }

  // --- Subtask Specific Database Methods ---

  async addSubtask(taskId: string, title: string) {
    return this.prisma.subtask.create({
      data: { title, taskId },
    });
  }

  async updateSubtask(subtaskId: string, dto: UpdateSubtaskDto) {
    return this.prisma.subtask.update({
      where: { id: subtaskId },
      data: dto,
    });
  }

  async deleteSubtask(subtaskId: string) {
    return this.prisma.subtask.delete({
      where: { id: subtaskId },
    });
  }

  async findSubtaskWithTask(subtaskId: string) {
    return this.prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: { Task: true },
    });
  }
}