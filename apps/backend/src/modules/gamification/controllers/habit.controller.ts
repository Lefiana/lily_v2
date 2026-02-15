// apps/backend/src/modules/gamification/controllers/habit.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { ActiveUser } from '@core/decorators/active-user.decorator';
import { HabitService } from '../services/habit.service';
import { CreateHabitDto, CompleteHabitDto } from '../dto/habit.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('habits')
@Controller('habits')
@UseGuards(AuthGuard)
export class HabitController {
  constructor(private readonly habitService: HabitService) {}

  @Get('suggestions')
  async getHabitSuggestions(
    @ActiveUser('id') userId: string,
    @Query('count') count?: number,
  ) {
    return this.habitService.getHabitSuggestions(userId, count || 3);
  }

  @Get('today')
  async getTodaysHabits(@ActiveUser('id') userId: string) {
    return this.habitService.getTodaysHabits(userId);
  }

  @Post()
  async createHabit(
    @ActiveUser('id') userId: string,
    @Body() dto: CreateHabitDto,
  ) {
    return this.habitService.createHabit(userId, dto.title, dto.templateId);
  }

  @Post(':habitId/complete')
  async completeHabit(
    @ActiveUser('id') userId: string,
    @Body() dto: CompleteHabitDto,
  ) {
    return this.habitService.completeHabit(userId, dto.habitId);
  }

  @Get('competence')
  async getCompetenceProgress(@ActiveUser('id') userId: string) {
    return this.habitService.getCompetenceProgress(userId);
  }
}
