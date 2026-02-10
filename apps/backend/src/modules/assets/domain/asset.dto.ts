// apps/backend/src/modules/assets/domain/asset.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { AssetCondition, AssetStatus } from '@prisma/client';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  sku?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  serialNumber?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category!: string;

  @IsInt()
  @Min(0)
  quantity: number = 1;

  @IsEnum(AssetCondition)
  @IsOptional()
  condition?: AssetCondition;

  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  location?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {
  @IsInt()
  @IsOptional()
  available?: number;
}

export class AssetFiltersDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus;

  @IsEnum(AssetCondition)
  @IsOptional()
  condition?: AssetCondition;

  @IsString()
  @IsOptional()
  query?: string;

  @IsOptional()
  availableOnly?: boolean;
}
