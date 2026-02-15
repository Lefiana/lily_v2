# Strategic Implementation Plan: Authentication Regression Fix & Gamification System

**Date:** 2026-02-14  
**Architect:** Principal Software Engineer  
**Status:** Phase 2 - Ready for Review  
**Estimated Implementation Time:** 8-10 days

---

## Executive Summary

This plan addresses a critical authentication regression in the logout flow and introduces a comprehensive gamification layer (Quest System, Currency Engine, Habit Tracker, and Dual-Pool Gacha) to the Lily V2 platform. The implementation follows zero-breaking-change principles while maintaining full-stack type integrity.

---

## Phase 1 Audit Summary

### Current Architecture Overview

**Stack:**

- **Frontend:** Next.js 16.1.0 + React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** NestJS 11 + Prisma ORM + PostgreSQL
- **Auth:** Better Auth with session-based cookies
- **State:** SWR for server state, WebSocket for real-time
- **Monorepo:** Turborepo with pnpm workspaces

### Key Findings

#### 1. Authentication System

- **Library:** Better Auth v1.3.34
- **Session Config:** 7-day expiry, 24-hour update age
- **Current Logout Issue:** Redirects to `/login` but sidebar logout handler is partially implemented
- **Security:** HttpOnly, Secure (prod), SameSite=Lax cookies

#### 2. Database Schema

- **No existing game tables** (currency, XP, gacha, habits)
- **User table** needs extension for `level`, `exp`, `currency`
- **Task system** already exists and can be leveraged for quests
- **Asset system** can represent gacha collection items

#### 3. API Patterns

- Controller-Service-Repository pattern
- `@ActiveUser('id')` decorator for user extraction
- `@UseGuards(AuthGuard)` for route protection
- DTO validation via `class-validator`
- WebSocket events for real-time updates

#### 4. Frontend Patterns

- SWR hooks with optimistic updates
- `use{Resource}.socket.ts` pattern for WebSocket listeners
- Toast notifications via `sonner`
- Glassmorphism UI theme (`glass-card`, `glass-input`)

### Critical Dependencies

- Better Auth session management
- Prisma schema migrations
- WebSocket event emission
- Vercel deployment compatibility

---

## Phase 2: Strategic Technical Orchestration

### Section 1: Core Logic Roadmap

#### 1.1 Authentication Fix - Logout Regression

**Problem Statement:**
Current logout implementation at `apps/web/components/layout/sidebar.tsx:83-91` redirects to `/login` but needs to ensure complete session invalidation both client-side and server-side, with proper navigation to landing page.

**Proposed Solution:**

```typescript
// apps/web/components/layout/sidebar.tsx - Updated Logout Handler
const handleLogout = async () => {
  try {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          // Force full page reload to clear all client state
          window.location.href = "/";
        },
        onError: (error) => {
          console.error("Logout failed:", error);
          toast.error("Logout failed. Please try again.");
        },
      },
    });
  } catch (error) {
    console.error("Logout exception:", error);
    // Fallback: clear local state and redirect
    window.location.href = "/";
  }
};
```

**Files to Modify:**

- `apps/web/components/layout/sidebar.tsx` (lines 83-91)

**Breaking Change Risk:** None - this is a bug fix

---

#### 1.2 Database Schema Extensions

**Migration 1: User Gamification Fields**

```prisma
// apps/backend/prisma/schema.prisma - Add to User model
model User {
  // ... existing fields ...

  // Gamification Fields
  level        Int      @default(1)
  exp          Int      @default(0)
  currency     Int      @default(0)  // Named 'crystals' in UI, 'currency' in DB
  competence   Int      @default(0)  // Habit competence score (0-100)
  lastDailyReset DateTime @default(now())

  // Relations
  dailyQuests  DailyQuest[]
  habitEntries HabitEntry[]
  gachaPulls   GachaPull[]
  collection   UserCollection[]
  currencyTransactions CurrencyTransaction[]
}
```

**Migration 2: Daily Quest System**

```prisma
model DailyQuest {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  title       String
  description String?
  completed   Boolean   @default(false)
  completedAt DateTime?

  // Rewards
  currencyReward Int @default(250)
  expReward      Int @default(50)

  // Daily tracking
  date        DateTime  @default(now())
  questNumber Int       // 1-5 for the 5 daily quests

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([userId, date, questNumber])
  @@index([userId, date])
  @@index([userId, completed])
}
```

**Migration 3: Habit System**

```prisma
enum HabitDifficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  EXPERT
}

model HabitTemplate {
  id          String         @id @default(cuid())
  title       String
  description String?
  category    String         // 'exercise', 'reading', 'meditation', etc.
  difficulty  HabitDifficulty @default(BEGINNER)
  minLevel    Int            @default(1)  // Minimum user level to unlock

  // Suggestion weights
  weight      Int            @default(1)  // Higher = more likely to suggest

  createdAt   DateTime       @default(now())

  @@index([difficulty, minLevel])
}

model HabitEntry {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  templateId  String?
  template    HabitTemplate? @relation(fields: [templateId], references: [id])

  customTitle String?   // If user creates custom habit

  completed   Boolean   @default(false)
  completedAt DateTime?

  date        DateTime  @default(now())

  // Rewards
  currencyReward Int @default(100)
  expReward      Int @default(50)
  competenceGain Int @default(5)  // Points toward competence bar

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId, date])
  @@index([userId, completed])
}
```

**Migration 4: Gacha System**

```prisma
enum GachaPoolType {
  STANDARD    // Wallhaven API pool - 1,000 currency
  PREMIUM     // Admin pool - 2,500 currency
}

enum RarityTier {
  COMMON      // 60%
  UNCOMMON    // 25%
  RARE        // 10%
  EPIC        // 4%
  LEGENDARY   // 1%
}

model GachaPool {
  id          String         @id @default(cuid())
  name        String
  description String?
  type        GachaPoolType
  cost        Int            // 1000 or 2500

  // Admin controls
  isActive    Boolean        @default(true)
  isAdminOnly Boolean        @default(false)

  // Wallhaven API config (for STANDARD pool)
  wallhavenTags String?      // e.g., "anime,landscape"

  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  items       GachaItem[]
  pulls       GachaPull[]
}

model GachaItem {
  id          String    @id @default(cuid())
  poolId      String
  pool        GachaPool @relation(fields: [poolId], references: [id], onDelete: Cascade)

  name        String
  description String?
  imageUrl    String
  rarity      RarityTier

  // Drop rates (must sum to 1.0 per pool)
  dropRate    Float     @default(0.1)

  // Storage info (for PREMIUM pool)
  storageType String?   // 'local' or 'cloud'
  storagePath String?

  createdAt   DateTime  @default(now())

  @@index([poolId, rarity])
}

model GachaPull {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  poolId      String
  pool        GachaPool @relation(fields: [poolId], references: [id])

  itemId      String
  item        GachaItem @relation(fields: [itemId], references: [id])

  cost        Int       // Actual cost paid (with multipliers)
  pulledAt    DateTime  @default(now())

  @@index([userId, pulledAt])
  @@index([poolId, pulledAt])
}

model UserCollection {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  itemId      String
  item        GachaItem @relation(fields: [itemId], references: [id])

  obtainedAt  DateTime  @default(now())
  pullCount   Int       @default(1)  // How many pulls to get this

  @@unique([userId, itemId])
  @@index([userId, obtainedAt])
}
```

**Migration 5: Currency Transaction Log**

```prisma
enum TransactionType {
  QUEST_REWARD
  HABIT_REWARD
  LEVEL_UP_BONUS
  GACHA_PULL
  ADMIN_GRANT
  ADMIN_DEDUCT
}

model CurrencyTransaction {
  id          String          @id @default(cuid())
  userId      String
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  amount      Int             // Positive = gain, Negative = spend
  type        TransactionType
  description String?

  // Balance tracking
  balanceBefore Int
  balanceAfter  Int

  metadata    Json?           // Additional context (questId, habitId, etc.)

  createdAt   DateTime        @default(now())

  @@index([userId, createdAt])
  @@index([userId, type])
}
```

---

#### 1.3 Leveling System Logic

**Formula Implementation:**

```typescript
// apps/backend/src/modules/gamification/utils/leveling.utils.ts

export enum UserTier {
  NOVICE = "Novice", // Level 1-10
  APPRENTICE = "Apprentice", // Level 11-25
  JOURNEYMAN = "Journeyman", // Level 26-50
  EXPERT = "Expert", // Level 51-80
  MASTER = "Master", // Level 81+
}

export class LevelingUtils {
  /**
   * Calculate XP required for next level
   * Formula: XP_NextLevel = 500 × log₂(Level + 1)
   */
  static getXpForLevel(level: number): number {
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

// Example progression:
// Level 1 → 2: 500 × log₂(2) = 500 XP
// Level 2 → 3: 500 × log₂(3) = 792 XP
// Level 3 → 4: 500 × log₂(4) = 1000 XP
// Level 10 → 11: 500 × log₂(11) = 1,730 XP
// Level 25 → 26: 500 × log₂(26) = 2,350 XP
// Level 50 → 51: 500 × log₂(51) = 2,829 XP
```

---

#### 1.4 Backend API Implementation

**Module Structure:**

```
apps/backend/src/modules/
├── gamification/
│   ├── gamification.module.ts
│   ├── controllers/
│   │   ├── quest.controller.ts
│   │   ├── habit.controller.ts
│   │   ├── gacha.controller.ts
│   │   └── user-stats.controller.ts
│   ├── services/
│   │   ├── quest.service.ts
│   │   ├── habit.service.ts
│   │   ├── gacha.service.ts
│   │   ├── user-stats.service.ts
│   │   └── leveling.service.ts
│   ├── dto/
│   │   ├── quest.dto.ts
│   │   ├── habit.dto.ts
│   │   └── gacha.dto.ts
│   ├── domain/
│   │   └── leveling.utils.ts
│   └── gateways/
│       └── gamification.gateway.ts
```

**1.4.1 Quest Controller**

```typescript
// apps/backend/src/modules/gamification/controllers/quest.controller.ts
import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { ActiveUser } from "@core/decorators/active-user.decorator";
import { QuestService } from "../services/quest.service";
import { CompleteQuestDto } from "../dto/quest.dto";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("quests")
@Controller("quests")
@UseGuards(AuthGuard)
export class QuestController {
  constructor(private readonly questService: QuestService) {}

  @Get("daily")
  async getDailyQuests(@ActiveUser("id") userId: string) {
    return this.questService.getDailyQuests(userId);
  }

  @Post("daily/:questId/complete")
  async completeDailyQuest(
    @ActiveUser("id") userId: string,
    @Body() dto: CompleteQuestDto,
  ) {
    return this.questService.completeQuest(userId, dto.questId);
  }

  @Post("daily/regenerate")
  async regenerateDailyQuests(@ActiveUser("id") userId: string) {
    return this.questService.regenerateDailyQuests(userId);
  }
}
```

**1.4.2 Quest Service**

```typescript
// apps/backend/src/modules/gamification/services/quest.service.ts
import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@core/prisma/prisma.service";
import { LevelingService } from "./leveling.service";
import { CurrencyService } from "./currency.service";
import { startOfDay, isSameDay } from "date-fns";

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

    if (!user) throw new BadRequestException("User not found");

    // Auto-generate if it's a new day
    if (!isSameDay(user.lastDailyReset, today)) {
      await this.generateDailyQuests(userId);
    }

    return this.prisma.dailyQuest.findMany({
      where: { userId, date: today },
      orderBy: { questNumber: "asc" },
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
        title: "Complete 3 Tasks",
        description: "Finish any 3 tasks from your quest board",
      },
      {
        title: "Organize Inventory",
        description: "Sort and categorize your assets",
      },
      {
        title: "Daily Check-in",
        description: "Log in and check your progress",
      },
      {
        title: "Help a Friend",
        description: "Share knowledge or assist a colleague",
      },
      {
        title: "Skill Practice",
        description: "Spend 30 minutes on skill development",
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

    if (!quest) throw new BadRequestException("Quest not found");
    if (quest.completed)
      throw new BadRequestException("Quest already completed");

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
        "QUEST_REWARD",
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
```

**1.4.3 Habit Controller**

```typescript
// apps/backend/src/modules/gamification/controllers/habit.controller.ts
import { Controller, Get, Post, Body, UseGuards, Query } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { ActiveUser } from "@core/decorators/active-user.decorator";
import { HabitService } from "../services/habit.service";
import { CreateHabitDto, CompleteHabitDto } from "../dto/habit.dto";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("habits")
@Controller("habits")
@UseGuards(AuthGuard)
export class HabitController {
  constructor(private readonly habitService: HabitService) {}

  @Get("suggestions")
  async getHabitSuggestions(
    @ActiveUser("id") userId: string,
    @Query("count") count?: number,
  ) {
    return this.habitService.getHabitSuggestions(userId, count || 3);
  }

  @Get("today")
  async getTodaysHabits(@ActiveUser("id") userId: string) {
    return this.habitService.getTodaysHabits(userId);
  }

  @Post()
  async createHabit(
    @ActiveUser("id") userId: string,
    @Body() dto: CreateHabitDto,
  ) {
    return this.habitService.createHabit(userId, dto);
  }

  @Post(":habitId/complete")
  async completeHabit(
    @ActiveUser("id") userId: string,
    @Body() dto: CompleteHabitDto,
  ) {
    return this.habitService.completeHabit(userId, dto.habitId);
  }

  @Get("competence")
  async getCompetenceProgress(@ActiveUser("id") userId: string) {
    return this.habitService.getCompetenceProgress(userId);
  }
}
```

**1.4.4 Gacha Controller**

```typescript
// apps/backend/src/modules/gamification/controllers/gacha.controller.ts
import { Controller, Get, Post, Body, UseGuards, Param } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { ActiveUser } from "@core/decorators/active-user.decorator";
import { GachaService } from "../services/gacha.service";
import { PullGachaDto } from "../dto/gacha.dto";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("gacha")
@Controller("gacha")
@UseGuards(AuthGuard)
export class GachaController {
  constructor(private readonly gachaService: GachaService) {}

  @Get("pools")
  async getPools(@ActiveUser("id") userId: string) {
    return this.gachaService.getAvailablePools(userId);
  }

  @Post("pull")
  async pullGacha(@ActiveUser("id") userId: string, @Body() dto: PullGachaDto) {
    return this.gachaService.pull(userId, dto.poolId);
  }

  @Get("collection")
  async getCollection(@ActiveUser("id") userId: string) {
    return this.gachaService.getUserCollection(userId);
  }

  @Get("history")
  async getPullHistory(
    @ActiveUser("id") userId: string,
    @Param("limit") limit?: number,
  ) {
    return this.gachaService.getPullHistory(userId, limit || 50);
  }
}

// Admin-only endpoints
@ApiTags("gacha-admin")
@Controller("gacha/admin")
@UseGuards(AuthGuard) // Add AdminGuard in production
export class GachaAdminController {
  constructor(private readonly gachaService: GachaService) {}

  @Post("pools")
  async createPool(@Body() dto: CreatePoolDto) {
    return this.gachaService.createPool(dto);
  }

  @Post("pools/:poolId/items")
  async addItemToPool(
    @Param("poolId") poolId: string,
    @Body() dto: AddItemDto,
  ) {
    return this.gachaService.addItemToPool(poolId, dto);
  }
}
```

**1.4.5 Gacha Service - Wallhaven Integration**

```typescript
// apps/backend/src/modules/gamification/services/gacha.service.ts
import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { PrismaService } from "@core/prisma/prisma.service";
import { LevelingService } from "./leveling.service";
import { CurrencyService } from "./currency.service";
import { GachaPoolType, RarityTier } from "@prisma/client";
import { firstValueFrom } from "rxjs";

interface WallhavenImage {
  id: string;
  url: string;
  thumbs: { original: string };
}

@Injectable()
export class GachaService {
  private readonly logger = new Logger(GachaService.name);
  private wallhavenCache: Map<string, WallhavenImage[]> = new Map();
  private wallhavenLastFetch: Map<string, Date> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes
  private readonly WALLHAVEN_API = "https://wallhaven.cc/api/v1/search";

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly levelingService: LevelingService,
    private readonly currencyService: CurrencyService,
  ) {}

  async getAvailablePools(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const where =
      user?.role === "ADMIN"
        ? { isActive: true }
        : { isActive: true, isAdminOnly: false };

    return this.prisma.gachaPool.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        cost: true,
        isAdminOnly: true,
        _count: { select: { items: true } },
      },
    });
  }

  async pull(userId: string, poolId: string) {
    const pool = await this.prisma.gachaPool.findUnique({
      where: { id: poolId },
      include: { items: true },
    });

    if (!pool || !pool.isActive) {
      throw new BadRequestException("Pool not found or inactive");
    }

    // Check admin-only restriction
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, currency: true, level: true },
    });

    if (pool.isAdminOnly && user?.role !== "ADMIN") {
      throw new BadRequestException("This pool is restricted to admins");
    }

    // Calculate cost with level multiplier
    const multiplier = this.levelingService.getCurrencyMultiplier(
      user?.level || 1,
    );
    const actualCost = Math.floor(pool.cost * multiplier);

    if (user!.currency < actualCost) {
      throw new BadRequestException("Insufficient currency");
    }

    // Fetch items based on pool type
    const items =
      pool.type === GachaPoolType.STANDARD
        ? await this.getWallhavenItems(pool)
        : pool.items;

    if (items.length === 0) {
      throw new BadRequestException("No items available in this pool");
    }

    // Perform weighted random selection
    const pulledItem = this.weightedRandomSelection(items);

    return this.prisma.$transaction(async (tx) => {
      // Deduct currency
      await this.currencyService.deductCurrency(
        userId,
        actualCost,
        "GACHA_PULL",
        `Pulled from ${pool.name}`,
        tx,
      );

      // Record the pull
      const pull = await tx.gachaPull.create({
        data: {
          userId,
          poolId,
          itemId: pulledItem.id,
          cost: actualCost,
        },
        include: { item: true },
      });

      // Add to collection (or increment count if already owned)
      await tx.userCollection.upsert({
        where: {
          userId_itemId: { userId, itemId: pulledItem.id },
        },
        create: {
          userId,
          itemId: pulledItem.id,
        },
        update: {
          pullCount: { increment: 1 },
        },
      });

      return {
        pull,
        isNew: !(await tx.userCollection.findUnique({
          where: { userId_itemId: { userId, itemId: pulledItem.id } },
        })),
      };
    });
  }

  private async getWallhavenItems(pool: any): Promise<any[]> {
    const cacheKey = pool.id;
    const cached = this.wallhavenCache.get(cacheKey);
    const lastFetch = this.wallhavenLastFetch.get(cacheKey);

    // Use cache if valid
    if (
      cached &&
      lastFetch &&
      Date.now() - lastFetch.getTime() < this.CACHE_TTL
    ) {
      return this.convertWallhavenToItems(cached);
    }

    try {
      // Fetch from Wallhaven API
      const response = await firstValueFrom(
        this.httpService.get(this.WALLHAVEN_API, {
          params: {
            q: pool.wallhavenTags || "anime",
            sorting: "random",
            purity: "100", // SFW only
            page: 1,
          },
          headers: {
            // Add API key if available for higher rate limits
            // 'X-API-Key': process.env.WALLHAVEN_API_KEY,
          },
        }),
      );

      const images: WallhavenImage[] = response.data.data.slice(0, 24);

      // Update cache
      this.wallhavenCache.set(cacheKey, images);
      this.wallhavenLastFetch.set(cacheKey, new Date());

      this.logger.log(
        `Fetched ${images.length} images from Wallhaven for pool ${pool.id}`,
      );

      return this.convertWallhavenToItems(images);
    } catch (error) {
      this.logger.error("Failed to fetch from Wallhaven:", error);

      // Fallback to cached data even if expired
      if (cached) {
        this.logger.warn("Using expired cache as fallback");
        return this.convertWallhavenToItems(cached);
      }

      throw new BadRequestException(
        "Unable to fetch gacha items. Please try again later.",
      );
    }
  }

  private convertWallhavenToItems(images: WallhavenImage[]): any[] {
    // Assign rarities randomly with weighted distribution
    const rarityWeights = [
      { tier: RarityTier.COMMON, weight: 60 },
      { tier: RarityTier.UNCOMMON, weight: 25 },
      { tier: RarityTier.RARE, weight: 10 },
      { tier: RarityTier.EPIC, weight: 4 },
      { tier: RarityTier.LEGENDARY, weight: 1 },
    ];

    return images.map((img, index) => ({
      id: `wallhaven-${img.id}`,
      name: `Wallpaper #${img.id}`,
      imageUrl: img.thumbs.original,
      rarity: this.weightedRandomSelection(rarityWeights),
      dropRate: 1 / images.length,
    }));
  }

  private weightedRandomSelection(items: any[]): any {
    const totalWeight = items.reduce(
      (sum, item) => sum + (item.weight || 1),
      0,
    );
    let random = Math.random() * totalWeight;

    for (const item of items) {
      random -= item.weight || 1;
      if (random <= 0) return item;
    }

    return items[items.length - 1];
  }

  async getUserCollection(userId: string) {
    return this.prisma.userCollection.findMany({
      where: { userId },
      include: { item: true },
      orderBy: { obtainedAt: "desc" },
    });
  }

  async getPullHistory(userId: string, limit: number) {
    return this.prisma.gachaPull.findMany({
      where: { userId },
      include: { item: true, pool: true },
      orderBy: { pulledAt: "desc" },
      take: limit,
    });
  }
}
```

---

#### 1.5 Frontend Implementation

**1.5.1 Hooks Architecture**

```typescript
// apps/web/hooks/useQuests.ts
"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { toast } from "sonner";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export interface DailyQuest {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completedAt: string | null;
  currencyReward: number;
  expReward: number;
  questNumber: number;
}

export interface QuestCompletionResult {
  quest: DailyQuest;
  rewards: { currency: number; exp: number };
  leveledUp: boolean;
}

export const useQuests = (userId: string) => {
  const endpoint = "/quests/daily";

  const {
    data: quests,
    error,
    isLoading,
    mutate,
  } = useSWR<DailyQuest[]>(userId ? endpoint : null, fetcher, {
    revalidateOnFocus: true,
  });

  const completeQuest = async (questId: string) => {
    try {
      const response = await api.post<QuestCompletionResult>(
        `/quests/daily/${questId}/complete`,
        { questId },
      );

      // Optimistic update
      mutate(
        (current) =>
          current?.map((q) =>
            q.id === questId
              ? { ...q, completed: true, completedAt: new Date().toISOString() }
              : q,
          ),
        false,
      );

      toast.success(
        `Quest completed! +${response.data.rewards.currency} crystals`,
      );

      if (response.data.leveledUp) {
        toast.success("Level Up! Your power grows...");
      }

      return response.data;
    } catch (err) {
      toast.error("Failed to complete quest");
      throw err;
    }
  };

  const regenerateQuests = async () => {
    try {
      await api.post("/quests/daily/regenerate");
      mutate();
      toast.success("New quests generated!");
    } catch (err) {
      toast.error("Failed to regenerate quests");
      throw err;
    }
  };

  const completedCount = quests?.filter((q) => q.completed).length || 0;
  const totalReward =
    quests?.reduce((sum, q) => sum + (q.completed ? q.currencyReward : 0), 0) ||
    0;

  return {
    quests: quests || [],
    isLoading,
    error,
    completedCount,
    totalReward,
    completeQuest,
    regenerateQuests,
    revalidate: () => mutate(),
  };
};
```

```typescript
// apps/web/hooks/useHabits.ts
"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface HabitSuggestion {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
}

export interface HabitEntry {
  id: string;
  templateId: string | null;
  customTitle: string | null;
  completed: boolean;
  category: string;
  currencyReward: number;
  expReward: number;
  competenceGain: number;
}

export interface CompetenceProgress {
  currentScore: number;
  maxScore: number;
  percentage: number;
  tier: string;
}

export const useHabits = (userId: string) => {
  const { data: suggestions, mutate: mutateSuggestions } = useSWR<
    HabitSuggestion[]
  >(userId ? "/habits/suggestions" : null, (url) =>
    api.get(url).then((res) => res.data),
  );

  const { data: todayHabits, mutate: mutateToday } = useSWR<HabitEntry[]>(
    userId ? "/habits/today" : null,
    (url) => api.get(url).then((res) => res.data),
  );

  const { data: competence } = useSWR<CompetenceProgress>(
    userId ? "/habits/competence" : null,
    (url) => api.get(url).then((res) => res.data),
  );

  const createHabit = async (title: string, templateId?: string) => {
    try {
      await api.post("/habits", { title, templateId });
      mutateToday();
      toast.success("Habit created!");
    } catch (err) {
      toast.error("Failed to create habit");
      throw err;
    }
  };

  const completeHabit = async (habitId: string) => {
    try {
      const response = await api.post(`/habits/${habitId}/complete`, {
        habitId,
      });
      mutateToday();
      toast.success(
        `Habit completed! +${response.data.rewards.competence} competence`,
      );
      return response.data;
    } catch (err) {
      toast.error("Failed to complete habit");
      throw err;
    }
  };

  return {
    suggestions: suggestions || [],
    todayHabits: todayHabits || [],
    competence: competence || {
      currentScore: 0,
      maxScore: 100,
      percentage: 0,
      tier: "Beginner",
    },
    createHabit,
    completeHabit,
    revalidate: () => {
      mutateSuggestions();
      mutateToday();
    },
  };
};
```

```typescript
// apps/web/hooks/useGacha.ts
"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface GachaPool {
  id: string;
  name: string;
  description: string | null;
  type: "STANDARD" | "PREMIUM";
  cost: number;
  isAdminOnly: boolean;
  _count: { items: number };
}

export interface GachaItem {
  id: string;
  name: string;
  imageUrl: string;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
}

export interface CollectionItem {
  id: string;
  item: GachaItem;
  obtainedAt: string;
  pullCount: number;
}

export interface PullResult {
  pull: {
    id: string;
    item: GachaItem;
    cost: number;
    pulledAt: string;
  };
  isNew: boolean;
}

export const useGacha = (userId: string) => {
  const { data: pools, error: poolsError } = useSWR<GachaPool[]>(
    userId ? "/gacha/pools" : null,
    (url) => api.get(url).then((res) => res.data),
  );

  const { data: collection, mutate: mutateCollection } = useSWR<
    CollectionItem[]
  >(userId ? "/gacha/collection" : null, (url) =>
    api.get(url).then((res) => res.data),
  );

  const pull = async (poolId: string): Promise<PullResult> => {
    try {
      const response = await api.post<PullResult>("/gacha/pull", { poolId });
      mutateCollection();

      const rarityLabels: Record<string, string> = {
        COMMON: "Common",
        UNCOMMON: "Uncommon",
        RARE: "Rare",
        EPIC: "Epic",
        LEGENDARY: "Legendary!",
      };

      const rarity = response.data.pull.item.rarity;
      if (rarity === "LEGENDARY") {
        toast.success(
          `✨ LEGENDARY! You obtained: ${response.data.pull.item.name}`,
        );
      } else {
        toast.success(
          `${rarityLabels[rarity]} pull: ${response.data.pull.item.name}`,
        );
      }

      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || "Pull failed";
      toast.error(message);
      throw err;
    }
  };

  return {
    pools: pools || [],
    collection: collection || [],
    isLoading: !pools && !poolsError,
    pull,
    revalidate: () => mutateCollection(),
  };
};
```

```typescript
// apps/web/hooks/useUserStats.ts
"use client";

import useSWR from "swr";
import { api } from "@/lib/api";

export interface UserStats {
  level: number;
  exp: number;
  currency: number;
  competence: number;
  tier: string;
  nextLevelXp: number;
  progressPercentage: number;
  currencyMultiplier: number;
}

export const useUserStats = (userId: string) => {
  const {
    data: stats,
    error,
    mutate,
  } = useSWR<UserStats>(
    userId ? "/user/stats" : null,
    (url) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: true },
  );

  return {
    stats: stats || {
      level: 1,
      exp: 0,
      currency: 0,
      competence: 0,
      tier: "Novice",
      nextLevelXp: 500,
      progressPercentage: 0,
      currencyMultiplier: 1,
    },
    isLoading: !stats && !error,
    error,
    revalidate: () => mutate(),
  };
};
```

**1.5.2 UI Components**

```typescript
// apps/web/components/gamification/QuestBoard.tsx
"use client";

import { useQuests } from "@/hooks/useQuests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

interface QuestBoardProps {
  userId: string;
}

export function QuestBoard({ userId }: QuestBoardProps) {
  const { quests, completedCount, isLoading, completeQuest } = useQuests(userId);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-white/10 rounded w-1/3" />
            <div className="h-20 bg-white/10 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = (completedCount / 5) * 100;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-400" />
          Daily Quests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">Progress</span>
            <span className="text-white">{completedCount}/5</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-3">
          {quests.map((quest) => (
            <div
              key={quest.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                quest.completed
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              {quest.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-zinc-500 mt-0.5 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <h4 className={`font-medium ${quest.completed ? "text-green-400 line-through" : "text-white"}`}>
                  {quest.title}
                </h4>
                {quest.description && (
                  <p className="text-sm text-zinc-400 mt-1">{quest.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="text-yellow-400">+{quest.currencyReward} crystals</span>
                  <span className="text-blue-400">+{quest.expReward} XP</span>
                </div>
              </div>

              {!quest.completed && (
                <Button
                  size="sm"
                  onClick={() => completeQuest(quest.id)}
                  className="shrink-0"
                >
                  Complete
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

```typescript
// apps/web/components/gamification/HabitTracker.tsx
"use client";

import { useHabits } from "@/hooks/useHabits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Dumbbell, BookOpen, Brain } from "lucide-react";

interface HabitTrackerProps {
  userId: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  exercise: <Dumbbell className="h-4 w-4" />,
  reading: <BookOpen className="h-4 w-4" />,
  meditation: <Brain className="h-4 w-4" />,
};

export function HabitTracker({ userId }: HabitTrackerProps) {
  const { suggestions, todayHabits, competence, createHabit, completeHabit } = useHabits(userId);

  return (
    <div className="space-y-6">
      {/* Competence Progress Bar */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Competence</h3>
              <p className="text-sm text-zinc-400">{competence.tier} Tier</p>
            </div>
            <span className="text-2xl font-bold text-purple-400">
              {competence.percentage}%
            </span>
          </div>
          <Progress value={competence.percentage} className="h-3" />
          <p className="text-xs text-zinc-500 mt-2">
            Complete habits to increase your competence score
          </p>
        </CardContent>
      </Card>

      {/* Suggested Habits */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-400" />
            Suggested Habits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {suggestions.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className="p-2 rounded-md bg-purple-500/20 text-purple-400">
                  {categoryIcons[habit.category] || <Target className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white">{habit.title}</h4>
                  <p className="text-sm text-zinc-400">{habit.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => createHabit(habit.title, habit.id)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's Habits */}
      {todayHabits.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Today&apos;s Habits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayHabits.map((habit) => (
                <div
                  key={habit.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    habit.completed
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <span className={habit.completed ? "text-green-400 line-through" : "text-white"}>
                    {habit.customTitle || habit.category}
                  </span>
                  {!habit.completed && (
                    <Button size="sm" onClick={() => completeHabit(habit.id)}>
                      Complete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

```typescript
// apps/web/components/gamification/GachaSystem.tsx
"use client";

import { useState } from "react";
import { useGacha } from "@/hooks/useGacha";
import { useUserStats } from "@/hooks/useUserStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Gem, Lock, Star } from "lucide-react";
import Image from "next/image";

interface GachaSystemProps {
  userId: string;
}

const rarityColors: Record<string, string> = {
  COMMON: "bg-zinc-500",
  UNCOMMON: "bg-green-500",
  RARE: "bg-blue-500",
  EPIC: "bg-purple-500",
  LEGENDARY: "bg-yellow-500",
};

export function GachaSystem({ userId }: GachaSystemProps) {
  const { pools, collection, pull, isLoading } = useGacha(userId);
  const { stats } = useUserStats(userId);
  const [pulling, setPulling] = useState<string | null>(null);
  const [lastPull, setLastPull] = useState<any>(null);

  const handlePull = async (poolId: string) => {
    setPulling(poolId);
    try {
      const result = await pull(poolId);
      setLastPull(result);
    } finally {
      setPulling(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Currency Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gem className="h-6 w-6 text-cyan-400" />
          <span className="text-2xl font-bold text-white">
            {stats.currency.toLocaleString()}
          </span>
          <span className="text-sm text-zinc-400">crystals</span>
        </div>
        <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">
          Level {stats.level} • {stats.tier}
        </Badge>
      </div>

      <Tabs defaultValue="pull" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pull">Pull Gacha</TabsTrigger>
          <TabsTrigger value="collection">Collection ({collection.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pull" className="space-y-4">
          {lastPull && (
            <Card className="glass-card border-yellow-500/30">
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-zinc-400 mb-2">
                    {lastPull.isNew ? "✨ New Item!" : "Duplicate Item"}
                  </p>
                  <div className="relative w-64 h-64 mx-auto mb-4 rounded-lg overflow-hidden">
                    <Image
                      src={lastPull.pull.item.imageUrl}
                      alt={lastPull.pull.item.name}
                      fill
                      className="object-cover"
                    />
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded ${rarityColors[lastPull.pull.item.rarity]} text-white text-xs font-bold`}>
                      {lastPull.pull.item.rarity}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white">{lastPull.pull.item.name}</h3>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {pools.map((pool) => {
              const actualCost = Math.floor(pool.cost * stats.currencyMultiplier);
              const canAfford = stats.currency >= actualCost;

              return (
                <Card key={pool.id} className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{pool.name}</CardTitle>
                      {pool.isAdminOnly && (
                        <Lock className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                    <p className="text-sm text-zinc-400">{pool.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-cyan-400" />
                        <span className={`text-xl font-bold ${canAfford ? "text-white" : "text-red-400"}`}>
                          {actualCost.toLocaleString()}
                        </span>
                        <span className="text-xs text-zinc-500">
                          (×{stats.currencyMultiplier.toFixed(2)})
                        </span>
                      </div>
                      <Button
                        onClick={() => handlePull(pool.id)}
                        disabled={!canAfford || pulling === pool.id}
                        className="bg-gradient-to-r from-purple-500 to-pink-500"
                      >
                        {pulling === pool.id ? "Pulling..." : "Pull"}
                      </Button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                      {pool._count.items} items available
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="collection">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            {collection.map((item) => (
              <Card key={item.id} className="glass-card overflow-hidden">
                <div className="relative aspect-square">
                  <Image
                    src={item.item.imageUrl}
                    alt={item.item.name}
                    fill
                    className="object-cover"
                  />
                  <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${rarityColors[item.item.rarity]}`}>
                    {item.item.rarity[0]}
                  </div>
                  {item.pullCount > 1 && (
                    <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-white">
                      ×{item.pullCount}
                    </div>
                  )}
                </div>
                <CardContent className="p-2">
                  <p className="text-xs text-white truncate">{item.item.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

```typescript
// apps/web/components/gamification/UserStatsBar.tsx
"use client";

import { useUserStats } from "@/hooks/useUserStats";
import { Progress } from "@/components/ui/progress";
import { Gem, Zap, Target } from "lucide-react";

interface UserStatsBarProps {
  userId: string;
}

const tierColors: Record<string, string> = {
  Novice: "text-zinc-400",
  Apprentice: "text-green-400",
  Journeyman: "text-blue-400",
  Expert: "text-purple-400",
  Master: "text-yellow-400",
};

export function UserStatsBar({ userId }: UserStatsBarProps) {
  const { stats, isLoading } = useUserStats(userId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-6 p-4 glass-card animate-pulse">
        <div className="h-4 bg-white/10 rounded w-24" />
        <div className="h-4 bg-white/10 rounded w-32" />
        <div className="h-4 bg-white/10 rounded w-20" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-6 p-4 glass-card">
      {/* Currency */}
      <div className="flex items-center gap-2">
        <Gem className="h-5 w-5 text-cyan-400" />
        <span className="text-lg font-bold text-white">
          {stats.currency.toLocaleString()}
        </span>
      </div>

      {/* Level & XP */}
      <div className="flex items-center gap-4 flex-1 min-w-[200px]">
        <div className="flex items-center gap-2 shrink-0">
          <Zap className="h-5 w-5 text-yellow-400" />
          <span className="font-bold text-white">Lv. {stats.level}</span>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className={tierColors[stats.tier]}>{stats.tier}</span>
            <span className="text-zinc-400">
              {stats.exp.toLocaleString()} / {stats.nextLevelXp.toLocaleString()} XP
            </span>
          </div>
          <Progress value={stats.progressPercentage} className="h-2" />
        </div>
      </div>

      {/* Multiplier */}
      <div className="flex items-center gap-2 text-sm">
        <Target className="h-4 w-4 text-purple-400" />
        <span className="text-zinc-400">Reward Boost:</span>
        <span className="font-bold text-purple-400">
          ×{stats.currencyMultiplier.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
```

**1.5.3 Gacha Page Integration**

```typescript
// apps/web/app/(dashboard)/gacha/page.tsx
"use client";

import { useSession } from "@/lib/auth-client";
import { GachaSystem } from "@/components/gamification/GachaSystem";
import { UserStatsBar } from "@/components/gamification/UserStatsBar";
import { QuestBoard } from "@/components/gamification/QuestBoard";
import { HabitTracker } from "@/components/gamification/HabitTracker";

export default function GachaPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-zinc-400">Please log in to access gacha</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Gacha & Rewards</h1>
      </div>

      <UserStatsBar userId={userId} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GachaSystem userId={userId} />
        </div>
        <div className="space-y-6">
          <QuestBoard userId={userId} />
          <HabitTracker userId={userId} />
        </div>
      </div>
    </div>
  );
}
```

---

### Section 2: Zero Breaking Changes Strategy

#### 2.1 Database Migration Strategy

**Phase 1: Schema Addition (Non-Breaking)**

```sql
-- Migration: Add gamification fields to User
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS exp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS competence INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_daily_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- All new tables are additive only
CREATE TABLE daily_quests (...)
CREATE TABLE habit_templates (...)
CREATE TABLE habit_entries (...)
CREATE TABLE gacha_pools (...)
CREATE TABLE gacha_items (...)
CREATE TABLE gacha_pulls (...)
CREATE TABLE user_collections (...)
CREATE TABLE currency_transactions (...)
```

**Phase 2: Backward Compatibility**

- All new fields have `DEFAULT` values
- Existing task completion flow remains unchanged
- New hooks are additive (don't modify existing task hooks)
- API endpoints are new (don't conflict with existing routes)

#### 2.2 API Versioning

All new endpoints are namespaced:

- `/api/quests/*` - New
- `/api/habits/*` - New
- `/api/gacha/*` - New
- `/api/user/stats` - New

Existing endpoints (`/api/tasks/*`) remain unchanged.

#### 2.3 Frontend Isolation

New components are isolated in `apps/web/components/gamification/`:

- No modifications to existing task components
- Sidebar link to `/gacha` already exists (commented code ready)
- Auth provider unchanged
- Existing SWR hooks untouched

#### 2.4 Rollback Plan

1. **Database:** Keep migrations reversible

   ```bash
   npx prisma migrate dev --create-only
   # Test rollback before deployment
   ```

2. **Feature Flags:** Implement simple feature toggles

   ```typescript
   // apps/web/lib/feature-flags.ts
   export const FEATURES = {
     GAMIFICATION: process.env.NEXT_PUBLIC_ENABLE_GAMIFICATION === "true",
   };
   ```

3. **Gradual Rollout:**
   - Deploy schema changes first
   - Deploy backend services second
   - Enable frontend features last

---

### Section 3: Full-Stack Type Integrity

#### 3.1 Shared Types

```typescript
// packages/types/src/gamification.ts
export interface UserGamification {
  level: number;
  exp: number;
  currency: number;
  competence: number;
  tier: UserTier;
}

export enum UserTier {
  NOVICE = "Novice",
  APPRENTICE = "Apprentice",
  JOURNEYMAN = "Journeyman",
  EXPERT = "Expert",
  MASTER = "Master",
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  currencyReward: number;
  expReward: number;
}

export interface GachaPool {
  id: string;
  name: string;
  type: "STANDARD" | "PREMIUM";
  cost: number;
}

export interface GachaItem {
  id: string;
  name: string;
  imageUrl: string;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
}
```

#### 3.2 Backend DTOs

```typescript
// apps/backend/src/modules/gamification/dto/quest.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";

export class CompleteQuestDto {
  @IsString()
  @IsNotEmpty()
  questId!: string;
}

export class CreateHabitDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  templateId?: string;
}

export class PullGachaDto {
  @IsString()
  @IsNotEmpty()
  poolId!: string;
}
```

#### 3.3 Frontend Type Exports

```typescript
// apps/web/types/gamification.ts
export type {
  DailyQuest,
  GachaPool,
  GachaItem,
  UserGamification,
  UserTier,
} from "@repo/types/gamification";

// Frontend-specific types
export interface QuestCompletionResult {
  quest: DailyQuest;
  rewards: { currency: number; exp: number };
  leveledUp: boolean;
}
```

#### 3.4 API Response Contracts

All API responses follow consistent structure:

```typescript
// Success
{
  "data": { ... },
  "meta": { "timestamp": "..." }
}

// Error
{
  "error": {
    "code": "INSUFFICIENT_CURRENCY",
    "message": "Not enough crystals for this pull"
  }
}
```

---

### Section 4: Edge Case & Failure Mode Mitigation

#### 4.1 Gacha System Resilience

**Wallhaven API Failure:**

```typescript
// Cached fallback implemented in GachaService
if (error) {
  if (cached && !this.isCacheExpired(cacheKey)) {
    return this.convertWallhavenToItems(cached);
  }
  throw new ServiceUnavailableException("Gacha temporarily unavailable");
}
```

**Rate Limiting Strategy:**

- Cache Wallhaven results for 30 minutes
- Batch fetch 24 images at once
- Implement exponential backoff on failures
- Use admin-configured fallback images if API fails

#### 4.2 Currency Race Conditions

```typescript
// Prisma transaction ensures atomicity
await this.prisma.$transaction(async (tx) => {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });

  if (user.currency < cost) {
    throw new BadRequestException("Insufficient currency");
  }

  await tx.user.update({
    where: { id: userId },
    data: { currency: { decrement: cost } },
  });

  // ... rest of transaction
});
```

#### 4.3 Daily Quest Reset Edge Cases

```typescript
// Handle timezone and missed days
async getDailyQuests(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { lastDailyReset: true },
  });

  const now = new Date();
  const lastReset = user?.lastDailyReset || new Date(0);

  // Check if it's a different day
  if (!isSameDay(now, lastReset)) {
    await this.generateDailyQuests(userId);
  }

  // Handle missed days (user hasn't logged in)
  // Just generate new quests, don't try to backfill
}
```

#### 4.4 Leveling System Overflow

```typescript
// Prevent integer overflow
static getXpForLevel(level: number): number {
  if (level > 1000) return Number.MAX_SAFE_INTEGER; // Cap at level 1000
  return Math.floor(500 * Math.log2(level + 1));
}
```

#### 4.5 Storage Fallback Strategy

```typescript
// Vercel-optimized storage
export class StorageService {
  async uploadImage(file: Buffer, filename: string): Promise<string> {
    if (process.env.VERCEL) {
      // Use Vercel Blob or external CDN
      return this.uploadToVercelBlob(file, filename);
    }
    // Local filesystem for development
    return this.saveToLocal(file, filename);
  }
}
```

---

### Section 5: Verification & Validation Protocol

#### 5.1 Unit Testing Strategy

```typescript
// apps/backend/src/modules/gamification/tests/leveling.service.spec.ts
describe("LevelingService", () => {
  it("should calculate correct XP for level 1", () => {
    expect(LevelingUtils.getXpForLevel(1)).toBe(500);
  });

  it("should calculate correct XP for level 10", () => {
    const expected = Math.floor(500 * Math.log2(11));
    expect(LevelingUtils.getXpForLevel(10)).toBe(expected);
  });

  it("should correctly determine tier from level", () => {
    expect(LevelingUtils.getTier(5)).toBe(UserTier.NOVICE);
    expect(LevelingUtils.getTier(15)).toBe(UserTier.APPRENTICE);
    expect(LevelingUtils.getTier(30)).toBe(UserTier.JOURNEYMAN);
    expect(LevelingUtils.getTier(60)).toBe(UserTier.EXPERT);
    expect(LevelingUtils.getTier(85)).toBe(UserTier.MASTER);
  });

  it("should calculate currency multiplier correctly", () => {
    expect(LevelingUtils.getCurrencyMultiplier(1)).toBe(1.05);
    expect(LevelingUtils.getCurrencyMultiplier(10)).toBe(1.5);
    expect(LevelingUtils.getCurrencyMultiplier(20)).toBe(2.0);
  });
});
```

#### 5.2 Integration Testing

```typescript
// Test quest completion flow
describe("Quest Integration", () => {
  it("should complete quest and award rewards", async () => {
    const user = await createTestUser();
    const quests = await questService.getDailyQuests(user.id);

    const initialCurrency = user.currency;
    const result = await questService.completeQuest(user.id, quests[0].id);

    expect(result.quest.completed).toBe(true);
    expect(result.rewards.currency).toBeGreaterThan(0);
    expect(result.rewards.exp).toBe(50);
  });
});
```

#### 5.3 E2E Testing Checklist

**Authentication:**

- [ ] Logout redirects to landing page
- [ ] Session invalidated on server
- [ ] Cannot access protected routes after logout

**Quest System:**

- [ ] 5 daily quests generated on first visit
- [ ] Completing quest awards currency and XP
- [ ] Cannot complete same quest twice
- [ ] New quests generated next day

**Habit System:**

- [ ] Suggestions appropriate to user level
- [ ] Completing habit increases competence
- [ ] Competence bar updates in real-time

**Gacha System:**

- [ ] Wallhaven API returns images
- [ ] Cache functions correctly
- [ ] Insufficient currency shows error
- [ ] Pull results stored in collection
- [ ] Admin pool restricted to admins

**Leveling:**

- [ ] XP formula calculated correctly
- [ ] Level up occurs at correct threshold
- [ ] Currency multiplier applied to rewards
- [ ] Tier changes reflected in UI

#### 5.4 Performance Benchmarks

```typescript
// Load testing thresholds
const BENCHMARKS = {
  QUEST_GENERATION: "< 100ms",
  GACHA_PULL: "< 500ms (including Wallhaven API)",
  COLLECTION_LOAD: "< 200ms for 1000 items",
  LEVEL_CALCULATION: "< 10ms",
  DATABASE_QUERIES: "< 50ms per query",
};
```

#### 5.5 Security Checklist

- [ ] All gamification endpoints use `@UseGuards(AuthGuard)`
- [ ] Admin-only gacha pool checks user role
- [ ] Currency transactions logged immutably
- [ ] Input validation on all DTOs
- [ ] Rate limiting on gacha pulls (e.g., 1 pull per 3 seconds)
- [ ] SQL injection prevention via Prisma
- [ ] XSS prevention via React escaping

---

## Implementation Timeline

### Week 1: Foundation

- Day 1-2: Database migrations and schema updates
- Day 3-4: Backend services (leveling, currency, quest)
- Day 5: Backend services (habit, gacha)

### Week 2: Frontend & Integration

- Day 6-7: Frontend hooks and API integration
- Day 8-9: UI components (QuestBoard, HabitTracker, GachaSystem)
- Day 10: Testing, bug fixes, and polish

---

## Risk Assessment

| Risk                       | Impact | Mitigation                             |
| -------------------------- | ------ | -------------------------------------- |
| Wallhaven API unavailable  | High   | Implement caching + fallback images    |
| Database migration failure | High   | Test in staging, reversible migrations |
| Currency calculation bugs  | High   | Unit tests + transaction safety        |
| Performance degradation    | Medium | Query optimization + caching           |
| User confusion             | Low    | Tooltips and onboarding tooltips       |

---

## Approval Checklist

Before implementation begins:

- [ ] Leveling formula approved: $XP_{NextLevel} = 500 \times \log_2(Level + 1)$
- [ ] Currency multiplier approved: $1 + (Level \times 0.05)$
- [ ] Gacha costs approved: 1,000 (Standard) / 2,500 (Premium)
- [ ] Daily quest limit approved: 5 quests × 250 crystals
- [ ] Habit reward approved: 100 crystals × 50 XP
- [ ] Wallhaven API usage approved (respect rate limits)
- [ ] Storage provider decided for admin gacha (Vercel Blob / Cloudinary / S3)
- [ ] Admin-only restrictions approved
- [ ] UI theme consistency approved

---

**Plan prepared by:** Principal Software Engineer  
**Date:** 2026-02-14  
**Review Status:** Pending Approval
