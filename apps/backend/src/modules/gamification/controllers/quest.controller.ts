// apps/backend/src/modules/gamification/controllers/quest.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { ActiveUser } from '@core/decorators/active-user.decorator';
import { QuestService } from '../services/quest.service';
import { CompleteQuestDto } from '../dto/quest.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('quests')
@Controller('quests')
@UseGuards(AuthGuard)
export class QuestController {
  constructor(private readonly questService: QuestService) {}

  @Get('daily')
  async getDailyQuests(@ActiveUser('id') userId: string) {
    return this.questService.getDailyQuests(userId);
  }

  @Post('daily/:questId/complete')
  async completeDailyQuest(
    @ActiveUser('id') userId: string,
    @Body() dto: CompleteQuestDto,
  ) {
    return this.questService.completeQuest(userId, dto.questId);
  }

  @Post('daily/regenerate')
  async regenerateDailyQuests(@ActiveUser('id') userId: string) {
    return this.questService.generateDailyQuests(userId);
  }
}
