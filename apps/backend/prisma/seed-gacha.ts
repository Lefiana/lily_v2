// apps/backend/prisma/seed-gacha.ts

import { PrismaClient, GachaPoolType, RarityTier } from '@prisma/client';

const prisma = new PrismaClient();

async function seedGachaPools() {
  console.log('🎲 Seeding default gacha pools...');

  // Check if pools already exist
  const existingPools = await prisma.gachaPool.count();
  if (existingPools > 0) {
    console.log(`⚠️  ${existingPools} pools already exist, skipping seed`);
    return;
  }

  // Create STANDARD pool
  const standardPool = await prisma.gachaPool.create({
    data: {
      name: 'Wallhaven Collection',
      description: 'Discover beautiful wallpapers from Wallhaven.cc',
      type: GachaPoolType.STANDARD,
      cost: 1000,
      isActive: true,
      isAdminOnly: false,
      wallhavenTags: 'anime,art,landscape',
      enableLocal: true,
      enableCloudinary: false,
      enableWallhaven: true,
    },
  });
  console.log(`✅ Created STANDARD pool: ${standardPool.id}`);

  // Create default rarity configs for STANDARD pool
  const defaultWeights = [
    { rarity: RarityTier.COMMON, weight: 60 },
    { rarity: RarityTier.UNCOMMON, weight: 25 },
    { rarity: RarityTier.RARE, weight: 10 },
    { rarity: RarityTier.EPIC, weight: 4 },
    { rarity: RarityTier.LEGENDARY, weight: 1 },
  ];

  const totalWeight = defaultWeights.reduce((sum, w) => sum + w.weight, 0);

  await prisma.poolRarityConfig.createMany({
    data: defaultWeights.map((w) => ({
      poolId: standardPool.id,
      rarity: w.rarity,
      weight: w.weight,
      probability: w.weight / totalWeight,
    })),
  });
  console.log(`✅ Created rarity configs for STANDARD pool`);

  // Create PREMIUM pool
  const premiumPool = await prisma.gachaPool.create({
    data: {
      name: 'Legendary Collection',
      description: 'Exclusive admin-curated premium items',
      type: GachaPoolType.PREMIUM,
      cost: 2500,
      isActive: true,
      isAdminOnly: true,
      enableLocal: true,
      enableCloudinary: true,
      enableWallhaven: false,
    },
  });
  console.log(`✅ Created PREMIUM pool: ${premiumPool.id}`);

  // Create default rarity configs for PREMIUM pool (higher rare rates)
  const premiumWeights = [
    { rarity: RarityTier.COMMON, weight: 30 },
    { rarity: RarityTier.UNCOMMON, weight: 30 },
    { rarity: RarityTier.RARE, weight: 25 },
    { rarity: RarityTier.EPIC, weight: 10 },
    { rarity: RarityTier.LEGENDARY, weight: 5 },
  ];

  const premiumTotalWeight = premiumWeights.reduce(
    (sum, w) => sum + w.weight,
    0,
  );

  await prisma.poolRarityConfig.createMany({
    data: premiumWeights.map((w) => ({
      poolId: premiumPool.id,
      rarity: w.rarity,
      weight: w.weight,
      probability: w.weight / premiumTotalWeight,
    })),
  });
  console.log(`✅ Created rarity configs for PREMIUM pool`);

  console.log('✨ Gacha pool seeding complete!');
}

seedGachaPools()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
