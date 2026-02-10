// apps/backend/src/modules/assets/controllers/assets.controller.ts

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
  BadRequestException,
} from '@nestjs/common';
import { AssetsService } from '../services/assets.service';
import {
  CreateAssetDto,
  UpdateAssetDto,
  AssetFiltersDto,
} from '../domain/asset.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ActiveUser } from '../../../core/decorators/active-user.decorator';
import { ApiTags } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';

const uploadConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(
        null,
        `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`,
      );
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
};

@ApiTags('assets')
@Controller('assets')
@UseGuards(AuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  async create(@Body() dto: CreateAssetDto, @ActiveUser('id') userId: string) {
    return this.assetsService.create(dto, userId);
  }

  @Get()
  async findAll(
    @Query() filters: AssetFiltersDto,
    @ActiveUser('id') userId: string,
  ) {
    return this.assetsService.findAll(userId, filters);
  }

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('category') category: string,
    @ActiveUser('id') userId: string,
  ) {
    return this.assetsService.search(userId, query, category);
  }

  @Get('available')
  async findAvailable(
    @ActiveUser('id') userId: string,
    @Query('category') category?: string,
  ) {
    return this.assetsService.findAvailable(userId, category);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @ActiveUser('id') userId: string) {
    return this.assetsService.findOne(id, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
    @ActiveUser('id') userId: string,
  ) {
    return this.assetsService.update(id, dto, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @ActiveUser('id') userId: string) {
    return this.assetsService.remove(id, userId);
  }

  // Attachment endpoints
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', uploadConfig))
  async uploadAttachment(
    @Param('id') assetId: string,
    @UploadedFile() file: Express.Multer.File,
    @ActiveUser('id') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.assetsService.uploadFile(assetId, userId, file);
  }

  @Delete('attachments/:attachmentId')
  async removeFile(
    @Param('attachmentId') attachmentId: string,
    @ActiveUser('id') userId: string,
  ) {
    return this.assetsService.removeAttachment(attachmentId, userId);
  }
}
