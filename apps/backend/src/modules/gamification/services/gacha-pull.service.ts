// apps/backend/src/modules/gamification/services/gacha-pull.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { GachaPool, RarityTier } from '@prisma/client';
import { AssetProviderRegistry } from '../providers/asset-provider.registry';
import { AssetItem } from '../providers/asset-provider.interface';

interface WeightedItem extends AssetItem {
  cumulativeWeight: number;
}

@Injectable()
export class GachaPullService {
  private readonly logger = new Logger(GachaPullService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: AssetProviderRegistry,
  ) {}

  /**
   * Execute a weighted random pull from a pool
   *
   * Algorithm:
   * 1. Fetch items from all enabled providers
   * 2. Group items by rarity
   * 3. Apply pool-specific rarity weights
   * 4. Select rarity based on weighted probability
   * 5. Select random item from chosen rarity group
   * 6. Return selected item
   */
  async executePull(
    pool: GachaPool,
    excludeItemIds?: string[],
  ): Promise<AssetItem> {
    // Step 1: Fetch all available items
    const items = await this.providerRegistry.getItems(
      pool,
      undefined, // Use default sources
      100, // Fetch more than needed for better selection
    );

    if (items.length === 0) {
      throw new Error('No items available in this pool');
    }

    // Filter out excluded items (for multi-pull without duplicates)
    const availableItems = excludeItemIds
      ? items.filter((item) => !excludeItemIds.includes(item.id))
      : items;

    if (availableItems.length === 0) {
      throw new Error('No remaining items available');
    }

    // Step 2: Get pool rarity configuration
    const rarityConfigs = await this.prisma.poolRarityConfig.findMany({
      where: { poolId: pool.id },
    });

    // Create rarity weight map
    const rarityWeights = new Map<RarityTier, number>();
    let totalRarityWeight = 0;

    for (const config of rarityConfigs) {
      rarityWeights.set(config.rarity, config.weight);
      totalRarityWeight += config.weight;
    }

    // Step 3: Group items by rarity
    const itemsByRarity = new Map<RarityTier, AssetItem[]>();
    for (const item of availableItems) {
      const group = itemsByRarity.get(item.rarity) || [];
      group.push(item);
      itemsByRarity.set(item.rarity, group);
    }

    // Step 4: Select rarity using weighted probability
    const selectedRarity = this.selectWeightedRarity(
      rarityWeights,
      totalRarityWeight,
    );

    // Step 5: Select random item from rarity group
    const rarityGroup = itemsByRarity.get(selectedRarity) || [];

    if (rarityGroup.length === 0) {
      // Fallback to common if selected rarity has no items
      this.logger.warn(
        `No items available for rarity ${selectedRarity}, falling back`,
      );
      const fallbackGroup =
        itemsByRarity.get(RarityTier.COMMON) || availableItems;
      return this.selectRandomItem(fallbackGroup);
    }

    return this.selectRandomItem(rarityGroup);
  }

  /**
   * Select a rarity based on weighted probabilities
   */
  private selectWeightedRarity(
    weights: Map<RarityTier, number>,
    totalWeight: number,
  ): RarityTier {
    let random = Math.random() * totalWeight;

    for (const [rarity, weight] of weights) {
      random -= weight;
      if (random <= 0) {
        return rarity;
      }
    }

    // Fallback to highest rarity if rounding errors occur
    return RarityTier.LEGENDARY;
  }

  /**
   * Select a random item from an array (uniform distribution)
   */
  private selectRandomItem(items: AssetItem[]): AssetItem {
    const index = Math.floor(Math.random() * items.length);
    return items[index];
  }

  /**
   * Alternative: Weighted random selection across all items
   * (Considers both rarity and item-specific weights)
   */
  async executeWeightedPull(pool: GachaPool): Promise<AssetItem> {
    const items = await this.providerRegistry.getItems(pool, undefined, 100);

    if (items.length === 0) {
      throw new Error('No items available in this pool');
    }

    // Get rarity configs
    const rarityConfigs = await this.prisma.poolRarityConfig.findMany({
      where: { poolId: pool.id },
    });

    const rarityWeightMap = new Map(
      rarityConfigs.map((c) => [c.rarity, c.weight]),
    );

    // Calculate effective weight for each item
    // Effective Weight = Rarity Weight × Item Weight
    const weightedItems: WeightedItem[] = items.map((item) => ({
      ...item,
      cumulativeWeight: 0, // Will be calculated
    }));

    let cumulativeWeight = 0;
    for (const item of weightedItems) {
      const rarityWeight = rarityWeightMap.get(item.rarity) || 1;
      const itemWeight = item.weight || 1;
      cumulativeWeight += rarityWeight * itemWeight;
      item.cumulativeWeight = cumulativeWeight;
    }

    // Select item using cumulative weights
    const random = Math.random() * cumulativeWeight;

    for (const item of weightedItems) {
      if (random <= item.cumulativeWeight) {
        return item;
      }
    }

    // Fallback to last item
    return weightedItems[weightedItems.length - 1];
  }
}
