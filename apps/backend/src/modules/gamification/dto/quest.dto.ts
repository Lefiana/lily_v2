// apps/backend/src/modules/gamification/dto/quest.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class CompleteQuestDto {
  @IsString()
  @IsNotEmpty()
  questId!: string;
}
