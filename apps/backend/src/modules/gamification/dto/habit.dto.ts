// apps/backend/src/modules/gamification/dto/habit.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateHabitDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  templateId?: string;
}

export class CompleteHabitDto {
  @IsString()
  @IsNotEmpty()
  habitId!: string;
}
