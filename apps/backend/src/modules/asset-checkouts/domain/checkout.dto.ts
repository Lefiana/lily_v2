// apps/backend/src/modules/asset-checkouts/domain/checkout.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsDate,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CheckoutStatus, AssetCondition } from '@prisma/client';

export class CheckoutItemDto {
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

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  borrowerName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  borrowerEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  borrowerPhone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  borrowerDepartment?: string;

  @IsString()
  @IsOptional()
  borrowerId?: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  dueDate!: Date;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];
}

export class ProcessReturnDto {
  @IsEnum(AssetCondition)
  condition!: AssetCondition;

  @IsBoolean()
  damageFlag: boolean = false;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  damageNotes?: string;
}

export class CheckoutFiltersDto {
  @IsEnum(CheckoutStatus)
  @IsOptional()
  status?: CheckoutStatus;

  @IsString()
  @IsOptional()
  borrowerId?: string;

  @IsString()
  @IsOptional()
  assetId?: string;

  @IsOptional()
  overdueOnly?: boolean;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  fromDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  toDate?: Date;
}
