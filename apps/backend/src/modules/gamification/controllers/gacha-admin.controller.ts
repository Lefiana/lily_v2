// apps/backend/src/modules/gamification/controllers/gacha-admin.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '@common/guards/role.guard';
import { Roles } from '@core/decorators/roles.decorator';
import { ActiveUser } from '@core/decorators/active-user.decorator';
import { UserRole } from '@prisma/client';
import { GachaAdminService } from '../services/gacha-admin.service';
import {
  CreatePoolDto,
  UpdatePoolDto,
  AddCloudinaryAssetDto,
  UpdateRarityConfigDto,
  UpdateAssetMetadataDto,
} from '../dto/gacha-admin.dto';
import { ApiTags, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('gacha-admin')
@Controller('gacha/admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class GachaAdminController {
  constructor(private readonly adminService: GachaAdminService) {}

  // ═══════════════════════════════════════════════════════════════
  // Pool Management
  // ═══════════════════════════════════════════════════════════════

  @Post('pools')
  async createPool(@Body() dto: CreatePoolDto) {
    return this.adminService.createPool(dto);
  }

  @Get('pools')
  async getAllPools() {
    return this.adminService.getAllPools();
  }

  @Get('pools/:poolId')
  async getPoolDetails(@Param('poolId') poolId: string) {
    return this.adminService.getPoolDetails(poolId);
  }

  @Put('pools/:poolId')
  async updatePool(
    @Param('poolId') poolId: string,
    @Body() dto: UpdatePoolDto,
  ) {
    return this.adminService.updatePool(poolId, dto);
  }

  @Delete('pools/:poolId')
  async deletePool(@Param('poolId') poolId: string) {
    return this.adminService.deletePool(poolId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Rarity Configuration
  // ═══════════════════════════════════════════════════════════════

  @Get('pools/:poolId/rarity-config')
  async getRarityConfig(@Param('poolId') poolId: string) {
    return this.adminService.getRarityConfig(poolId);
  }

  @Put('pools/:poolId/rarity-config')
  async updateRarityConfig(
    @Param('poolId') poolId: string,
    @Body() dto: UpdateRarityConfigDto,
  ) {
    return this.adminService.updateRarityConfig(poolId, dto.configs);
  }

  // ═══════════════════════════════════════════════════════════════
  // Cloudinary Asset Management
  // ═══════════════════════════════════════════════════════════════

  @Get('pools/:poolId/cloudinary-assets')
  async getCloudinaryAssets(@Param('poolId') poolId: string) {
    return this.adminService.getCloudinaryAssets(poolId);
  }

  @Post('pools/:poolId/cloudinary-assets/url')
  async addCloudinaryAssetByUrl(
    @Param('poolId') poolId: string,
    @Body() dto: AddCloudinaryAssetDto,
    @ActiveUser('id') adminId: string,
  ) {
    return this.adminService.addCloudinaryAssetByUrl(poolId, dto, adminId);
  }

  @Post('pools/:poolId/cloudinary-assets/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async uploadCloudinaryAsset(
    @Param('poolId') poolId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdateAssetMetadataDto,
    @ActiveUser('id') adminId: string,
  ) {
    return this.adminService.uploadCloudinaryAsset(poolId, file, dto, adminId);
  }

  @Put('cloudinary-assets/:assetId')
  async updateCloudinaryAsset(
    @Param('assetId') assetId: string,
    @Body() dto: UpdateAssetMetadataDto,
  ) {
    return this.adminService.updateCloudinaryAsset(assetId, dto);
  }

  @Delete('cloudinary-assets/:assetId')
  async deleteCloudinaryAsset(@Param('assetId') assetId: string) {
    return this.adminService.deleteCloudinaryAsset(assetId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Local Asset Management
  // ═══════════════════════════════════════════════════════════════

  @Get('pools/:poolId/local-assets')
  async getLocalAssets(@Param('poolId') poolId: string) {
    return this.adminService.getLocalAssets(poolId);
  }

  @Post('pools/:poolId/local-assets/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async uploadLocalAsset(
    @Param('poolId') poolId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdateAssetMetadataDto,
  ) {
    return this.adminService.uploadLocalAsset(poolId, file, dto);
  }

  @Put('local-assets/:assetId/metadata')
  async updateLocalAssetMetadata(
    @Param('assetId') assetId: string,
    @Body() dto: UpdateAssetMetadataDto,
  ) {
    return this.adminService.updateLocalAssetMetadata(assetId, dto);
  }

  @Delete('local-assets/:assetId')
  async deleteLocalAsset(@Param('assetId') assetId: string) {
    return this.adminService.deleteLocalAsset(assetId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Provider Health & Diagnostics
  // ═══════════════════════════════════════════════════════════════

  @Get('health')
  async getProviderHealth() {
    return this.adminService.getProviderHealth();
  }

  @Post('cache/clear')
  async clearCache(
    @Query('source') source?: string,
    @Query('poolId') poolId?: string,
  ) {
    return this.adminService.clearCache(source, poolId);
  }
}
