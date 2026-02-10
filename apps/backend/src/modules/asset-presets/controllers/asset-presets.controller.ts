// apps/backend/src/modules/asset-presets/controllers/asset-presets.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AssetPresetsService } from '../services/asset-presets.service';
import { CreatePresetDto, UpdatePresetDto } from '../domain/preset.dto';
import { ActiveUser } from '../../../core/decorators/active-user.decorator';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';

@ApiTags('asset-presets')
@Controller('asset-presets')
@UseGuards(AuthGuard)
export class AssetPresetsController {
  constructor(private readonly presetsService: AssetPresetsService) {}

  @Post()
  async create(@Body() dto: CreatePresetDto, @ActiveUser('id') userId: string) {
    return this.presetsService.create(dto, userId);
  }

  @Get()
  async findAll(
    @ActiveUser('id') userId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.presetsService.findAll(userId, includeInactive === 'true');
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @ActiveUser('id') userId: string) {
    return this.presetsService.findOne(id, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePresetDto,
    @ActiveUser('id') userId: string,
  ) {
    return this.presetsService.update(id, dto, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @ActiveUser('id') userId: string) {
    return this.presetsService.remove(id, userId);
  }
}
