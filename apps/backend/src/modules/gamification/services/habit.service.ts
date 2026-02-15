// apps/backend/src/modules/gamification/services/habit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { LevelingService } from './leveling.service';
import { CurrencyService } from './currency.service';
import { startOfDay, isSameDay } from 'date-fns';
import { HabitDifficulty, TransactionType } from '@prisma/client';

@Injectable()
export class HabitService {
  private readonly logger = new Logger(HabitService.name);
  private readonly BASE_CURRENCY_REWARD = 100;
  private readonly BASE_EXP_REWARD = 50;
  private readonly COMPETENCE_GAIN = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly levelingService: LevelingService,
    private readonly currencyService: CurrencyService,
  ) {}

  async getHabitSuggestions(userId: string, count: number = 3) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { level: true },
    });

    const userLevel = user?.level || 1;

    // Get templates appropriate for user's level
    const templates = await this.prisma.habitTemplate.findMany({
      where: {
        minLevel: { lte: userLevel },
      },
      orderBy: { weight: 'desc' },
      take: count * 2, // Get more than needed for randomness
    });

    // Shuffle and return requested count
    const shuffled = templates.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  async getTodaysHabits(userId: string) {
    const today = startOfDay(new Date());

    return this.prisma.habitEntry.findMany({
      where: {
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: { template: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createHabit(userId: string, title: string, templateId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { level: true },
    });

    const multiplier = this.levelingService.getCurrencyMultiplier(
      user?.level || 1,
    );
    const currencyReward = Math.floor(this.BASE_CURRENCY_REWARD * multiplier);

    return this.prisma.habitEntry.create({
      data: {
        userId,
        templateId,
        customTitle: templateId ? undefined : title,
        currencyReward,
        expReward: this.BASE_EXP_REWARD,
        competenceGain: this.COMPETENCE_GAIN,
      },
      include: { template: true },
    });
  }

  async completeHabit(userId: string, habitId: string) {
    const habit = await this.prisma.habitEntry.findFirst({
      where: { id: habitId, userId },
    });

    if (!habit) throw new Error('Habit not found');
    if (habit.completed) throw new Error('Habit already completed');

    return this.prisma.$transaction(async (tx) => {
      // Mark habit complete
      await tx.habitEntry.update({
        where: { id: habitId },
        data: { completed: true, completedAt: new Date() },
      });

      // Award currency
      await this.currencyService.addCurrency(
        userId,
        habit.currencyReward,
        TransactionType.HABIT_REWARD,
        `Completed habit: ${habit.customTitle || habit.templateId}`,
        tx,
      );

      // Award EXP
      await this.levelingService.addExp(userId, habit.expReward, tx);

      // Increase competence
      await tx.user.update({
        where: { id: userId },
        data: { competence: { increment: habit.competenceGain } },
      });

      return {
        habit,
        rewards: {
          currency: habit.currencyReward,
          exp: habit.expReward,
          competence: habit.competenceGain,
        },
      };
    });
  }

  async getCompetenceProgress(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { competence: true },
    });

    if (!user) throw new Error('User not found');

    const maxScore = 100;
    const percentage = Math.min(100, (user.competence / maxScore) * 100);

    return {
      currentScore: user.competence,
      maxScore,
      percentage: Math.floor(percentage),
      tier: this.getCompetenceTier(user.competence),
    };
  }

  private getCompetenceTier(score: number): string {
    if (score >= 80) return 'Master';
    if (score >= 60) return 'Expert';
    if (score >= 40) return 'Advanced';
    if (score >= 20) return 'Intermediate';
    return 'Beginner';
  }
}
