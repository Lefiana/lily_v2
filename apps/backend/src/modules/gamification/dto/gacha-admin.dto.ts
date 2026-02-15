// apps/backend/src/modules/gamification/dto/gacha-admin.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsUrl,
  Min,
  Max,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RarityTier } from '@prisma/client';

export class CreatePoolDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['STANDARD', 'PREMIUM'])
  type!: 'STANDARD' | 'PREMIUM';

  @IsNumber()
  @Min(1)
  cost!: number;

  @IsOptional()
  @IsBoolean()
  isAdminOnly?: boolean;

  @IsString()
  @IsOptional()
  wallhavenTags?: string;

  @IsArray()
  @IsEnum(['local', 'cloudinary', 'wallhaven'], { each: true })
  @IsOptional()
  sourcePriority?: string[];
}

export class UpdatePoolDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['STANDARD', 'PREMIUM'])
  @IsOptional()
  type?: 'STANDARD' | 'PREMIUM';

  @IsNumber()
  @Min(1)
  @IsOptional()
  cost?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isAdminOnly?: boolean;

  @IsString()
  @IsOptional()
  wallhavenTags?: string;

  @IsArray()
  @IsEnum(['local', 'cloudinary', 'wallhaven'], { each: true })
  @IsOptional()
  sourcePriority?: string[];
}

export class RarityConfigItemDto {
  @IsEnum(RarityTier)
  rarity!: RarityTier;

  @IsNumber()
  @Min(1)
  weight!: number;
}

export class UpdateRarityConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RarityConfigItemDto)
  configs!: RarityConfigItemDto[];
}

export class AddCloudinaryAssetDto {
  @IsString()
  @IsNotEmpty()
  publicId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(RarityTier)
  rarity!: RarityTier;

  @IsNumber()
  @IsOptional()
  @Min(1)
  weight?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class UpdateAssetMetadataDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(RarityTier)
  @IsOptional()
  rarity?: RarityTier;

  @IsNumber()
  @Min(1)
  @IsOptional()
  weight?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
