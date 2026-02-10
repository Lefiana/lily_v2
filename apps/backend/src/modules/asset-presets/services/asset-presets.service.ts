// apps/backend/src/modules/asset-presets/services/asset-presets.service.ts

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { AssetPresetsRepository } from '../repositories/asset-presets.repository';
import { CreatePresetDto, UpdatePresetDto } from '../domain/preset.dto';

@Injectable()
export class AssetPresetsService {
  private readonly logger = new Logger(AssetPresetsService.name);

  constructor(private readonly repo: AssetPresetsRepository) {}

  private handleError(error: unknown, context: string): never {
    if (error instanceof NotFoundException) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`${context}: ${message}`);
    throw new InternalServerErrorException(context);
  }

  async create(dto: CreatePresetDto, userId: string) {
    try {
      return await this.repo.create(dto, userId);
    } catch (error) {
      this.handleError(error, 'Error creating preset');
    }
  }

  async findAll(userId: string, includeInactive?: boolean) {
    try {
      return await this.repo.findAll(userId, includeInactive);
    } catch (error) {
      this.handleError(error, 'Error fetching presets');
    }
  }

  async findOne(id: string, userId: string) {
    try {
      const preset = await this.repo.findById(id, userId);
      if (!preset)
        throw new NotFoundException(`Preset with ID ${id} not found`);
      return preset;
    } catch (error) {
      this.handleError(error, 'Error retrieving preset');
    }
  }

  async update(id: string, dto: UpdatePresetDto, userId: string) {
    try {
      await this.findOne(id, userId); // Ensure ownership
      return await this.repo.update(id, dto, userId);
    } catch (error) {
      this.handleError(error, 'Could not update preset');
    }
  }

  async remove(id: string, userId: string) {
    try {
      await this.findOne(id, userId);
      await this.repo.delete(id);
      return { success: true };
    } catch (error) {
      this.handleError(error, 'Could not delete preset');
    }
  }
}
