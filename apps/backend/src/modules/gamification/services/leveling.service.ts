// apps/backend/src/modules/gamification/services/leveling.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { LevelingUtils, UserTier } from '../domain/leveling.utils';
import { Prisma } from '@prisma/client';

@Injectable()
export class LevelingService {
  private readonly logger = new Logger(LevelingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add EXP to user and handle level ups
   * Returns true if user leveled up
   */
  async addExp(
    userId: string,
    expAmount: number,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const prisma = tx || this.prisma;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { level: true, exp: true },
    });

    if (!user) {
      this.logger.warn(`User ${userId} not found for EXP addition`);
      return false;
    }

    const newTotalXp = user.exp + expAmount;
    const newLevel = LevelingUtils.getLevelFromXp(newTotalXp);
    const leveledUp = newLevel > user.level;

    const updateData: any = { exp: newTotalXp };

    if (leveledUp) {
      updateData.level = newLevel;
      this.logger.log(
        `User ${userId} leveled up from ${user.level} to ${newLevel}`,
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return leveledUp;
  }

  /**
   * Get user stats with computed values
   */
  async getUserStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        level: true,
        exp: true,
        currency: true,
        competence: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const tier = LevelingUtils.getTier(user.level);
    const nextLevelXp = LevelingUtils.getTotalXpForLevel(user.level + 1);
    const progressPercentage = LevelingUtils.getProgressToNextLevel(
      user.level,
      user.exp,
    );
    const currencyMultiplier = LevelingUtils.getCurrencyMultiplier(user.level);

    return {
      ...user,
      tier,
      nextLevelXp,
      progressPercentage,
      currencyMultiplier,
    };
  }

  /**
   * Get currency multiplier for a user
   */
  getCurrencyMultiplier(level: number): number {
    return LevelingUtils.getCurrencyMultiplier(level);
  }

  /**
   * Get tier from level
   */
  getTier(level: number): UserTier {
    return LevelingUtils.getTier(level);
  }
}
