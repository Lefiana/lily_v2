// apps/backend/src/modules/gamification/services/quest.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { LevelingService } from './leveling.service';
import { CurrencyService } from './currency.service';
import { startOfDay, isSameDay } from 'date-fns';
import { TransactionType } from '@prisma/client';

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);
  private readonly DAILY_QUEST_LIMIT = 5;
  private readonly BASE_CURRENCY_REWARD = 250;
  private readonly BASE_EXP_REWARD = 50;

  constructor(
    private readonly prisma: PrismaService,
    private readonly levelingService: LevelingService,
    private readonly currencyService: CurrencyService,
  ) {}

  async getDailyQuests(userId: string) {
    const today = startOfDay(new Date());

    // Check if we need to generate new quests
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastDailyReset: true },
    });

    if (!user) throw new BadRequestException('User not found');

    // Auto-generate if it's a new day
    if (!isSameDay(user.lastDailyReset, today)) {
      await this.generateDailyQuests(userId);
    }

    return this.prisma.dailyQuest.findMany({
      where: { userId, date: today },
      orderBy: { questNumber: 'asc' },
    });
  }

  async generateDailyQuests(userId: string) {
    const today = startOfDay(new Date());

    // Get user level for reward calculation
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { level: true },
    });

    const multiplier = this.levelingService.getCurrencyMultiplier(
      user?.level || 1,
    );
    const currencyReward = Math.floor(this.BASE_CURRENCY_REWARD * multiplier);

    // Generate 5 varied quests
    const questTemplates = [
      {
        title: 'Complete 3 Tasks',
        description: 'Finish any 3 tasks from your quest board',
      },
      {
        title: 'Organize Inventory',
        description: 'Sort and categorize your assets',
      },
      {
        title: 'Daily Check-in',
        description: 'Log in and check your progress',
      },
      {
        title: 'Help a Friend',
        description: 'Share knowledge or assist a colleague',
      },
      {
        title: 'Skill Practice',
        description: 'Spend 30 minutes on skill development',
      },
    ];

    const quests = questTemplates.map((template, index) => ({
      userId,
      title: template.title,
      description: template.description,
      date: today,
      questNumber: index + 1,
      currencyReward,
      expReward: this.BASE_EXP_REWARD,
    }));

    await this.prisma.$transaction([
      // Delete old quests for this day
      this.prisma.dailyQuest.deleteMany({
        where: { userId, date: today },
      }),
      // Create new quests
      this.prisma.dailyQuest.createMany({ data: quests }),
      // Update user's last reset time
      this.prisma.user.update({
        where: { id: userId },
        data: { lastDailyReset: new Date() },
      }),
    ]);

    this.logger.log(`Generated daily quests for user ${userId}`);
    return this.getDailyQuests(userId);
  }

  async completeQuest(userId: string, questId: string) {
    const quest = await this.prisma.dailyQuest.findFirst({
      where: { id: questId, userId },
    });

    if (!quest) throw new BadRequestException('Quest not found');
    if (quest.completed)
      throw new BadRequestException('Quest already completed');

    return this.prisma.$transaction(async (tx) => {
      // Mark quest complete
      await tx.dailyQuest.update({
        where: { id: questId },
        data: { completed: true, completedAt: new Date() },
      });

      // Award currency
      await this.currencyService.addCurrency(
        userId,
        quest.currencyReward,
        TransactionType.QUEST_REWARD,
        `Completed quest: ${quest.title}`,
        tx,
      );

      // Award EXP and check for level up
      const leveledUp = await this.levelingService.addExp(
        userId,
        quest.expReward,
        tx,
      );

      return {
        quest,
        rewards: {
          currency: quest.currencyReward,
          exp: quest.expReward,
        },
        leveledUp,
      };
    });
  }
}
