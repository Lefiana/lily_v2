// apps/backend/src/modules/gamification/dto/gacha.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class PullGachaDto {
  @IsString()
  @IsNotEmpty()
  poolId!: string;
}

export class CreatePoolDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  type!: 'STANDARD' | 'PREMIUM';

  cost!: number;
}

export class AddItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  imageUrl!: string;

  rarity!: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
}
