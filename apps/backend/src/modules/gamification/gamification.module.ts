// apps/backend/src/modules/gamification/gamification.module.ts
import { Module } from '@nestjs/common';
import { QuestController } from './controllers/quest.controller';
import { HabitController } from './controllers/habit.controller';
import { GachaController } from './controllers/gacha.controller';
import { UserStatsController } from './controllers/user-stats.controller';
import { QuestService } from './services/quest.service';
import { HabitService } from './services/habit.service';
import { GachaService } from './services/gacha.service';
import { LevelingService } from './services/leveling.service';
import { CurrencyService } from './services/currency.service';

@Module({
  controllers: [
    QuestController,
    HabitController,
    GachaController,
    UserStatsController,
  ],
  providers: [
    QuestService,
    HabitService,
    GachaService,
    LevelingService,
    CurrencyService,
  ],
  exports: [LevelingService, CurrencyService],
})
export class GamificationModule {}
