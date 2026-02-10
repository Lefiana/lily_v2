import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { TasksService } from '../services/tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  UpdateSubtaskDto,
} from '../domain/task.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { Response } from 'express';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { ApiTags } from '@nestjs/swagger';
import { ActiveUser } from '../../../core/decorators/active-user.decorator'; // Adjust path
import { UseGuards } from '@nestjs/common';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @ActiveUser('id') userId: string,
  ) {
    return this.tasksService.create(createTaskDto, userId);
  }

  @Get('search')
  async search(
    @Query('q') q: string,
    @Query('category') category: string,
    @ActiveUser('id') userId: string,
  ) {
    return this.tasksService.findAll(userId, q, category);
  }

  @Get()
  async findAll(
    @Query('category') category: string,
    @ActiveUser('id') userId: string,
  ) {
    // User ID received from ActiveUser decorator - logged by AuthGuard
    return this.tasksService.findAll(userId, undefined, category);
  }

  @Get('inventory')
  async getInventory(
    @Query('category') category: string,
    @ActiveUser('id') userId: string,
  ) {
    return this.tasksService.findAllForInventory(userId, category);
  }

  // --- File Uploads ---
  @Get('attachments/:attachmentId/download')
  async downloadFile(
    @Param('attachmentId') attachmentId: string,
    @ActiveUser('id') userId: string,
    @Res() res: Response,
  ) {
    const attachment = await this.tasksService.getAttachmentForDownload(
      attachmentId,
      userId,
    );
    const fileName = attachment.filepath.replace('/uploads/', '');
    const fullPath = join(process.cwd(), 'uploads', fileName);
    return res.download(fullPath, attachment.filename);
  }

  @Delete('attachments/:attachmentId')
  async removeFile(
    @Param('attachmentId') attachmentId: string,
    @ActiveUser('id') userId: string,
  ) {
    return this.tasksService.removeAttachment(attachmentId, userId);
  }

  @Post(':id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`,
          );
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadAttachment(
    @Param('id') taskId: string,
    @UploadedFile() file: Express.Multer.File,
    @ActiveUser('id') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.tasksService.uploadFile(taskId, userId, file);
  }

  @Post(':id/attachments/bulk')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`,
          );
        },
      }),
    }),
  )
  async uploadMultiple(
    @Param('id') taskId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @ActiveUser('id') userId: string,
  ) {
    if (!files || files.length === 0)
      throw new BadRequestException('Files required');
    return this.tasksService.uploadMultipleFiles(taskId, userId, files);
  }

  // --- Subtask Endpoints ---

  @Post(':id/subtasks')
  async addSubtask(
    @Param('id') taskId: string,
    @Body('title') title: string,
    @ActiveUser('id') userId: string,
  ) {
    return this.tasksService.addSubtask(taskId, title, userId);
  }

  @Patch('subtasks/:subtaskId')
  async updateSubtask(
    @Param('subtaskId') subtaskId: string,
    @Body() updateSubtaskDto: UpdateSubtaskDto,
    @ActiveUser('id') userId: string,
  ) {
    return this.tasksService.updateSubtask(subtaskId, updateSubtaskDto, userId);
  }

  @Delete('subtasks/:subtaskId')
  async removeSubtask(
    @Param('subtaskId') subtaskId: string,
    @ActiveUser('id') userId: string,
  ) {
    return this.tasksService.deleteSubtask(subtaskId, userId);
  }

  // --- get all with id tasks
  @Get(':id')
  async findOne(@Param('id') id: string, @ActiveUser('id') userId: string) {
    return this.tasksService.findOne(id, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @ActiveUser('id') userId: string,
  ) {
    return this.tasksService.update(id, updateTaskDto, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @ActiveUser('id') userId: string) {
    return this.tasksService.remove(id, userId);
  }
}
