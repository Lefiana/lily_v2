// apps/backend/src/modules/asset-presets/domain/preset.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class PresetItemDto {
  @IsString()
  @IsNotEmpty()
  assetId!: string;

  @IsInt()
  @Min(1)
  quantity: number = 1;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePresetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PresetItemDto)
  items!: PresetItemDto[];
}

export class UpdatePresetDto extends PartialType(CreatePresetDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
