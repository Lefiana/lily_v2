// apps/backend/src/modules/gamification/domain/leveling.utils.ts

export enum UserTier {
  NOVICE = 'Novice',
  APPRENTICE = 'Apprentice',
  JOURNEYMAN = 'Journeyman',
  EXPERT = 'Expert',
  MASTER = 'Master',
}

export class LevelingUtils {
  /**
   * Calculate XP required for next level
   * Formula: XP_NextLevel = 500 × log₂(Level + 1)
   */
  static getXpForLevel(level: number): number {
    if (level > 1000) return Number.MAX_SAFE_INTEGER;
    return Math.floor(500 * Math.log2(level + 1));
  }

  /**
   * Calculate total XP required to reach a level from level 1
   */
  static getTotalXpForLevel(targetLevel: number): number {
    let total = 0;
    for (let i = 1; i < targetLevel; i++) {
      total += this.getXpForLevel(i);
    }
    return total;
  }

  /**
   * Determine current level from total XP
   */
  static getLevelFromXp(totalXp: number): number {
    let level = 1;
    let xpAccumulated = 0;

    while (true) {
      const xpNeeded = this.getXpForLevel(level);
      if (xpAccumulated + xpNeeded > totalXp) {
        break;
      }
      xpAccumulated += xpNeeded;
      level++;
    }

    return level;
  }

  /**
   * Get tier from level
   */
  static getTier(level: number): UserTier {
    if (level >= 81) return UserTier.MASTER;
    if (level >= 51) return UserTier.EXPERT;
    if (level >= 26) return UserTier.JOURNEYMAN;
    if (level >= 11) return UserTier.APPRENTICE;
    return UserTier.NOVICE;
  }

  /**
   * Calculate currency reward multiplier
   * Formula: Multiplier = 1 + (Level × 0.05)
   */
  static getCurrencyMultiplier(level: number): number {
    return 1 + level * 0.05;
  }

  /**
   * Calculate progress to next level (0-100%)
   */
  static getProgressToNextLevel(
    currentLevel: number,
    currentXp: number,
  ): number {
    const xpForCurrentLevelTotal = this.getTotalXpForLevel(currentLevel);
    const xpForNextLevelTotal = this.getTotalXpForLevel(currentLevel + 1);
    const xpInCurrentLevel = currentXp - xpForCurrentLevelTotal;
    const xpNeededForNext = xpForNextLevelTotal - xpForCurrentLevelTotal;

    return Math.min(
      100,
      Math.max(0, (xpInCurrentLevel / xpNeededForNext) * 100),
    );
  }
}
