// apps/backend/src/modules/gamification/services/gacha.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '@core/prisma/prisma.service';
import { LevelingService } from './leveling.service';
import { CurrencyService } from './currency.service';
import { GachaPoolType, RarityTier, TransactionType } from '@prisma/client';

interface WallhavenImage {
  id: string;
  url: string;
  thumbs: { original: string };
}

interface WallhavenResponse {
  data: WallhavenImage[];
}

@Injectable()
export class GachaService {
  private readonly logger = new Logger(GachaService.name);
  private wallhavenCache: Map<string, WallhavenImage[]> = new Map();
  private wallhavenLastFetch: Map<string, Date> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes
  private readonly WALLHAVEN_API = 'https://wallhaven.cc/api/v1/search';

  constructor(
    private readonly prisma: PrismaService,
    private readonly levelingService: LevelingService,
    private readonly currencyService: CurrencyService,
  ) {}

  async getAvailablePools(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const where =
      user?.role === 'ADMIN'
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
      throw new BadRequestException('Pool not found or inactive');
    }

    // Check admin-only restriction
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, currency: true, level: true },
    });

    if (pool.isAdminOnly && user?.role !== 'ADMIN') {
      throw new BadRequestException('This pool is restricted to admins');
    }

    // Calculate cost with level multiplier
    const multiplier = this.levelingService.getCurrencyMultiplier(
      user?.level || 1,
    );
    const actualCost = Math.floor(pool.cost * multiplier);

    if (user!.currency < actualCost) {
      throw new BadRequestException('Insufficient currency');
    }

    // Fetch items based on pool type
    const items =
      pool.type === GachaPoolType.STANDARD
        ? await this.getWallhavenItems(pool)
        : pool.items;

    if (items.length === 0) {
      throw new BadRequestException('No items available in this pool');
    }

    // Perform weighted random selection
    const pulledItem = this.weightedRandomSelection(items);

    return this.prisma.$transaction(async (tx) => {
      // Deduct currency
      await this.currencyService.deductCurrency(
        userId,
        actualCost,
        TransactionType.GACHA_PULL,
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
      const response = await axios.get<WallhavenResponse>(this.WALLHAVEN_API, {
        params: {
          q: pool.wallhavenTags || 'anime',
          sorting: 'random',
          purity: '100', // SFW only
          page: 1,
        },
        headers: {
          // Inject API key if available for higher rate limits
          ...(process.env.WALLHAVEN_API_KEY && {
            'X-API-Key': process.env.WALLHAVEN_API_KEY,
          }),
        },
        timeout: 10000, // 10-second timeout
      });

      const images: WallhavenImage[] = response.data.data.slice(0, 24);

      // Update cache
      this.wallhavenCache.set(cacheKey, images);
      this.wallhavenLastFetch.set(cacheKey, new Date());

      this.logger.log(
        `Fetched ${images.length} images from Wallhaven for pool ${pool.id}`,
      );

      return this.convertWallhavenToItems(images);
    } catch (error) {
      this.logger.error('Failed to fetch from Wallhaven:', error);

      // Fallback to cached data even if expired
      if (cached) {
        this.logger.warn('Using expired cache as fallback');
        return this.convertWallhavenToItems(cached);
      }

      throw new ServiceUnavailableException(
        'Unable to fetch gacha items. Please try again later.',
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

    return images.map((img) => ({
      id: `wallhaven-${img.id}`,
      name: `Wallpaper #${img.id}`,
      imageUrl: img.thumbs.original,
      rarity: this.weightedRandomSelection(rarityWeights).tier,
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
      orderBy: { obtainedAt: 'desc' },
    });
  }

  async getPullHistory(userId: string, limit: number) {
    return this.prisma.gachaPull.findMany({
      where: { userId },
      include: { item: true, pool: true },
      orderBy: { pulledAt: 'desc' },
      take: limit,
    });
  }

  async createPool(dto: any) {
    return this.prisma.gachaPool.create({
      data: {
        name: dto.name,
        type: dto.type,
        cost: dto.cost,
      },
    });
  }

  async addItemToPool(poolId: string, dto: any) {
    return this.prisma.gachaItem.create({
      data: {
        poolId,
        name: dto.name,
        imageUrl: dto.imageUrl,
        rarity: dto.rarity,
      },
    });
  }
}
