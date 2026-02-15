// apps/backend/src/modules/gamification/controllers/user-stats.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { ActiveUser } from '@core/decorators/active-user.decorator';
import { LevelingService } from '../services/leveling.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('user')
@Controller('user')
@UseGuards(AuthGuard)
export class UserStatsController {
  constructor(private readonly levelingService: LevelingService) {}

  @Get('stats')
  async getUserStats(@ActiveUser('id') userId: string) {
    return this.levelingService.getUserStats(userId);
  }
}
