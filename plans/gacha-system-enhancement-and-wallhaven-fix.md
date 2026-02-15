# Strategic Implementation Plan: Gacha System Enhancement & Wallhaven API Fix

**Date:** 2026-02-15  
**Architect:** Principal Software Engineer  
**Status:** Phase 2 - Ready for Review  
**Estimated Implementation Time:** 5-7 days  
**Priority:** High (Production Error Resolution + Feature Enhancement)

---

## Executive Summary

This plan addresses critical production issues in the Gacha system ("No gacha pools available" error, Wallhaven API key not being injected) and introduces a comprehensive Dual-Source Asset Provider architecture supporting both local static file serving and Cloudinary CDN integration. The implementation includes an Admin-only configuration interface for rarity mapping, Cloudinary URL management, and a robust rarity-weighted pull algorithm.

---

## Phase 1: Deep Contextual & Architectural Audit

### 1.1 Global Data Flow & State Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GACHA SYSTEM DATA FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐      ┌──────────────────────────────────────────┐        │
│  │   Frontend   │      │              Backend                      │        │
│  │  (Next.js)   │      │   (NestJS + Prisma + PostgreSQL)         │        │
│  └──────┬───────┘      └──────────────────┬───────────────────────┘        │
│         │                                   │                               │
│         │  1. GET /gacha/pools              │                               │
│         │◄─────────────────────────────────│                               │
│         │                                   │                               │
│         │  2. Response: Pool[]              │                               │
│         │  (with _count.items)              │                               │
│         │                                   │                               │
│         │  3. POST /gacha/pull {poolId}    │                               │
│         │─────────────────────────────────►│                               │
│         │                                   │                               │
│         │                                   │  ┌─────────────────────┐     │
│         │                                   │  │   Pool Type Check   │     │
│         │                                   │  └──────────┬──────────┘     │
│         │                                   │             │                │
│         │                                   │     ┌───────┴───────┐        │
│         │                                   │     ▼               ▼        │
│         │                                   │  ┌──────┐        ┌──────┐   │
│         │                                   │  │LOCAL │        │WALL- │   │
│         │                                   │  │ASSETS│        │HAVEN │   │
│         │                                   │  └──┬───┘        └──┬───┘   │
│         │                                   │     │               │       │
│         │                                   │  DB Query    API Call +     │
│         │                                   │              Cache Check    │
│         │                                   │                             │
│         │                                   │  ┌─────────────────────┐    │
│         │                                   │  │ Rarity Weighted     │    │
│         │                                   │  │ Random Selection    │    │
│         │                                   │  └──────────┬──────────┘    │
│         │                                   │             │               │
│         │                                   │     Transaction Block       │
│         │                                   │  (Currency + Pull + Coll.)  │
│         │                                   │                             │
│         │  4. Response: PullResult          │                             │
│         │◄─────────────────────────────────│                             │
│         │                                   │                             │
│  ┌──────▼───────┐      ┌───────────────────▼───────────────────────────┐ │
│  │    SWR       │      │           Prisma ORM                        │ │
│  │   Cache      │      │  ┌──────────┬──────────┬──────────────────┐  │ │
│  │              │      │  │GachaPool │GachaItem │UserCollection    │  │ │
│  └──────────────┘      │  └──────────┴──────────┴──────────────────┘  │ │
│                        └───────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**State Management Pattern:**

- **Frontend:** SWR (stale-while-revalidate) for server state caching with optimistic updates
- **Backend:** In-memory LRU cache for Wallhaven API responses (30-min TTL)
- **Database:** PostgreSQL with Prisma ORM, ACID transactions for pull operations

### 1.2 Core Dependencies & Database Schema

**Current Database Schema (Gacha Module):**

```prisma
// Gacha Pool Definition
model GachaPool {
  id          String         @id @default(cuid())
  name        String
  description String?
  type        GachaPoolType  // STANDARD | PREMIUM
  cost        Int            // 1000 or 2500
  isActive    Boolean        @default(true)
  isAdminOnly Boolean        @default(false)
  wallhavenTags String?      // Tags for Wallhaven API
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  items       GachaItem[]
  pulls       GachaPull[]
}

// Gacha Item Definition
model GachaItem {
  id          String    @id @default(cuid())
  poolId      String
  pool        GachaPool @relation(fields: [poolId], references: [id], onDelete: Cascade)
  name        String
  description String?
  imageUrl    String
  rarity      RarityTier // COMMON | UNCOMMON | RARE | EPIC | LEGENDARY
  dropRate    Float     @default(0.1)  // Must sum to 1.0 per pool
  storageType String?   // 'local' | 'cloud' - EXTEND FOR CLOUDINARY
  storagePath String?   // Path or Cloudinary public_id
  createdAt   DateTime  @default(now())
  pulls       GachaPull[]
  collection  UserCollection[]
  @@index([poolId, rarity])
}

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
```

**Environment Variables:**

```env
WALLHAVEN_API_KEY="7Drrh7h7UNAYbRNH6gW64fpBrCvxzqFz"  # EXISTS BUT NOT USED
DATABASE_URL="postgresql://..."
CLOUDINARY_CLOUD_NAME=""     # TO BE ADDED
CLOUDINARY_API_KEY=""        # TO BE ADDED
CLOUDINARY_API_SECRET=""     # TO BE ADDED
```

### 1.3 Source of Truth Analysis

| Entity                  | Source of Truth  | Location                     | Notes                                                      |
| ----------------------- | ---------------- | ---------------------------- | ---------------------------------------------------------- |
| **Gacha Pools**         | Database         | `GachaPool` table            | Admin-created, type-based (STANDARD/PREMIUM)               |
| **Pool Items**          | Hybrid           | DB + External APIs           | STANDARD pools fetch from Wallhaven; PREMIUM pools from DB |
| **User Collections**    | Database         | `UserCollection` table       | Unique per user-item pair with pull count                  |
| **Pull History**        | Database         | `GachaPull` table            | Immutable transaction log                                  |
| **Rarity Weights**      | Code (Currently) | `gacha.service.ts:207-213`   | Hardcoded weights - NEEDS MIGRATION TO CONFIGURABLE        |
| **Wallhaven Data**      | External API     | `wallhaven.cc/api/v1/search` | 30-min in-memory cache                                     |
| **Cloudinary Assets**   | Cloudinary CDN   | `res.cloudinary.com`         | TO BE IMPLEMENTED                                          |
| **Local Static Assets** | Filesystem       | `apps/backend/public/gacha/` | TO BE IMPLEMENTED                                          |

### 1.4 Identified Structural Bottlenecks & Issues

#### 🔴 **CRITICAL ISSUE 1: Wallhaven API Key Not Injected**

**Location:** `apps/backend/src/modules/gamification/services/gacha.service.ts:173-176`

**Current Code:**

```typescript
headers: {
  // Add API key if available for higher rate limits
  // 'X-API-Key': process.env.WALLHAVEN_API_KEY,
},
```

**Impact:**

- API rate limited to unauthenticated tier (significantly lower limits)
- Higher risk of 429 errors during peak usage
- No fallback authentication if IP-based limits exceeded

**Root Cause:** Commented out during development, never uncommented for production

#### 🔴 **CRITICAL ISSUE 2: "No Gacha Pools Available" Error**

**Location:** `apps/web/components/gamification/GachaSystem.tsx:100-104`

**Current Flow:**

1. Frontend queries `GET /gacha/pools`
2. Backend returns `SELECT * FROM GachaPool WHERE isActive = true`
3. If no pools exist in database → returns empty array `[]`
4. Frontend displays: "No gacha pools available."

**Root Cause:**

- No database seeding/migration creates default pools
- No admin UI exists to create pools
- New deployments start with empty pool table

**Current Rarity Assignment (Randomized):**

```typescript
private convertWallhavenToItems(images: WallhavenImage[]): any[] {
  const rarityWeights = [
    { tier: RarityTier.COMMON, weight: 60 },
    { tier: RarityTier.UNCOMMON, weight: 25 },
    { tier: RarityTier.RARE, weight: 10 },
    { tier: RarityTier.EPIC, weight: 4 },
    { tier: RarityTier.LEGENDARY, weight: 1 },
  ];
  // ... assigns rarity randomly per-image
}
```

**Problem:**

- No admin control over individual item rarities
- Cannot configure specific images as "Legendary"
- Hardcoded weights not persisted to database

#### 🟡 **MEDIUM ISSUE 4: No Local/Cloud Dual-Source Architecture**

**Current Limitation:**

- Only Wallhaven API source supported for STANDARD pools
- No mechanism for serving local static files
- No Cloudinary CDN integration
- Storage type field exists in schema but unused (`storageType`, `storagePath`)

#### 🟡 **MEDIUM ISSUE 5: Empty State During API Cooldowns**

**Current Cache Behavior:**

```typescript
// If cache expired and API fails
if (cached) {
  this.logger.warn("Using expired cache as fallback");
  return this.convertWallhavenToItems(cached);
}
throw new ServiceUnavailableException("Unable to fetch gacha items...");
```

**Problem:**

- On fresh deploy with no cache, API failure = complete service outage
- No graceful degradation to local assets
- User sees error message rather than fallback content

### 1.5 Security Vulnerabilities Identified

| Vulnerability                   | Location                    | Severity | Description                                                 |
| ------------------------------- | --------------------------- | -------- | ----------------------------------------------------------- |
| **Unvalidated Image URLs**      | `gacha.service.ts:218`      | Medium   | Wallhaven URLs injected directly without validation         |
| **No Rate Limiting on Pull**    | `gacha.controller.ts:28-31` | Medium   | Users can spam pull endpoint (though currency check exists) |
| **Admin-only Pool Bypass Risk** | `gacha.service.ts:79-81`    | Low      | Proper role check exists but relies on JWT token integrity  |
| **No Input Sanitization**       | `gacha.service.ts:166-177`  | Low      | Wallhaven tags parameter passed directly to external API    |

### 1.6 Impact Analysis: Mission-Critical Features

**Adjacent Modules at Risk:**

1. **Currency System** (`currency.service.ts`)
   - **Impact:** High - Gacha pulls deduct currency; any bug affects user balances
   - **Contract:** Transactional consistency required between `currency.deduct` and `gachaPull.create`
   - **Risk:** If gacha fails after currency deduct, user loses currency without receiving item

2. **Leveling System** (`leveling.service.ts`)
   - **Impact:** Medium - Currency multiplier affects gacha cost calculation
   - **Contract:** `LevelingService.getCurrencyMultiplier()` used in cost calculation
   - **Risk:** Incorrect multiplier could cause economic imbalance

3. **Collection/Inventory** (`UserCollection` model)
   - **Impact:** High - Gacha results populate user collections
   - **Contract:** `userCollection.upsert()` with `pullCount` increment
   - **Risk:** Duplicate entries or lost items if transaction fails

4. **User Stats Display** (`UserStatsBar.tsx`)
   - **Impact:** Low - Displays currency that gacha system modifies
   - **Contract:** SWR cache invalidation after pull
   - **Risk:** Stale currency display after successful pull

**Shared Utility Functions:**

```typescript
// apps/backend/src/modules/gamification/services/leveling.service.ts
getCurrencyMultiplier(level: number): number  // Affects gacha cost

// apps/backend/src/modules/gamification/services/currency.service.ts
deductCurrency(userId, amount, type, description, tx)  // Used in pull transaction
addCurrency(userId, amount, type, description, tx)     // Used for rewards

// apps/web/hooks/useGacha.ts
mutateCollection()  // Invalidates SWR cache after pull
```

**API Contracts at Risk:**

| Endpoint            | Method | Contract                                         | Risk Level               |
| ------------------- | ------ | ------------------------------------------------ | ------------------------ |
| `/gacha/pools`      | GET    | Returns `GachaPool[]` with `_count.items`        | Low - Read-only          |
| `/gacha/pull`       | POST   | Accepts `{poolId: string}`, returns `PullResult` | **High** - Transactional |
| `/gacha/collection` | GET    | Returns `UserCollection[]` with item details     | Low - Read-only          |
| `/gacha/history`    | GET    | Returns `GachaPull[]` with pagination            | Low - Read-only          |

---

## Phase 2: Strategic Technical Orchestration

### Section 2.1: Core Logic Roadmap

#### 2.1.1 Fix: Wallhaven API Key Injection

**Current State (BROKEN):**

```typescript
// apps/backend/src/modules/gamification/services/gacha.service.ts:166-177
const response = await axios.get<WallhavenResponse>(this.WALLHAVEN_API, {
  params: {
    q: pool.wallhavenTags || "anime",
    sorting: "random",
    purity: "100",
    page: 1,
  },
  headers: {
    // ❌ COMMENTED OUT - KEY NOT BEING USED
    // 'X-API-Key': process.env.WALLHAVEN_API_KEY,
  },
});
```

**Proposed Fix:**

```typescript
// apps/backend/src/modules/gamification/services/gacha.service.ts:166-182
const response = await axios.get<WallhavenResponse>(this.WALLHAVEN_API, {
  params: {
    q: pool.wallhavenTags || "anime",
    sorting: "random",
    purity: "100",
    page: 1,
  },
  headers: {
    // ✅ INJECT API KEY FROM ENVIRONMENT
    ...(process.env.WALLHAVEN_API_KEY && {
      "X-API-Key": process.env.WALLHAVEN_API_KEY,
    }),
  },
  timeout: 10000, // 10-second timeout
});
```

**Rationale:**

- Conditional injection prevents errors if key not configured
- 10s timeout prevents hanging requests
- Uses authenticated tier with higher rate limits

#### 2.1.2 Fix: "No Gacha Pools Available" Root Cause

**Solution A: Database Migration with Default Pools**

```typescript
// apps/backend/prisma/migrations/20250215000000_seed_default_gacha_pools/migration.sql

-- Create default STANDARD pool
INSERT INTO "GachaPool" (id, name, description, type, cost, "isActive", "isAdminOnly", "wallhavenTags", "createdAt", "updatedAt")
VALUES (
  'default-standard-pool',
  'Standard Collection',
  'A curated collection of wallpapers from Wallhaven',
  'STANDARD',
  1000,
  true,
  false,
  'anime,landscape,artistic',
  NOW(),
  NOW()
);

-- Create default PREMIUM pool (admin-only initially)
INSERT INTO "GachaPool" (id, name, description, type, cost, "isActive", "isAdminOnly", "createdAt", "updatedAt")
VALUES (
  'default-premium-pool',
  'Premium Collection',
  'Exclusive high-rarity items (Admin curated)',
  'PREMIUM',
  2500,
  true,
  true,
  NOW(),
  NOW()
);
```

**Solution B: Prisma Seed Script Enhancement**

```typescript
// apps/backend/prisma/seed-gacha.ts

import { PrismaClient, GachaPoolType, RarityTier } from "@prisma/client";

const prisma = new PrismaClient();

async function seedGachaPools() {
  console.log("🎲 Seeding default gacha pools...");

  // Check if pools already exist
  const existingPools = await prisma.gachaPool.count();
  if (existingPools > 0) {
    console.log(`⚠️  ${existingPools} pools already exist, skipping seed`);
    return;
  }

  // Create STANDARD pool
  const standardPool = await prisma.gachaPool.create({
    data: {
      name: "Wallhaven Collection",
      description: "Discover beautiful wallpapers from Wallhaven.cc",
      type: GachaPoolType.STANDARD,
      cost: 1000,
      isActive: true,
      isAdminOnly: false,
      wallhavenTags: "anime,art,landscape",
    },
  });
  console.log(`✅ Created STANDARD pool: ${standardPool.id}`);

  // Create PREMIUM pool
  const premiumPool = await prisma.gachaPool.create({
    data: {
      name: "Legendary Collection",
      description: "Exclusive admin-curated premium items",
      type: GachaPoolType.PREMIUM,
      cost: 2500,
      isActive: true,
      isAdminOnly: true,
    },
  });
  console.log(`✅ Created PREMIUM pool: ${premiumPool.id}`);

  console.log("✨ Gacha pool seeding complete!");
}

seedGachaPools()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Add to package.json:**

```json
{
  "scripts": {
    "seed:gacha": "ts-node prisma/seed-gacha.ts"
  }
}
```

#### 2.1.3 Implementation: Dual-Source Asset Provider Architecture

**Architecture Overview:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    DUAL-SOURCE ASSET PROVIDER PATTERN                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                    AssetProvider Interface                            │    │
│  │  ─────────────────────────────────────────────────────────────────   │    │
│  │  + getItems(pool: GachaPool): Promise<GachaItem[]>                   │    │
│  │  + getItemUrl(item: GachaItem): string                               │    │
│  │  + validateItem(item: GachaItem): Promise<boolean>                   │    │
│  └────────────────────┬─────────────────────────────────────────────────┘    │
│                       │                                                       │
│         ┌─────────────┼─────────────┐                                        │
│         │             │             │                                        │
│         ▼             ▼             ▼                                        │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                               │
│  │  Wallhaven │ │   Local    │ │ Cloudinary │                               │
│  │  Provider  │ │  Provider  │ │  Provider  │                               │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘                               │
│        │              │              │                                      │
│        │              │              │                                      │
│  ┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐                              │
│  │External API│ │ Filesystem │ │   CDN      │                              │
│  │  + Cache   │ │ /public    │ │  Upload    │                              │
│  │  (30 min)  │ │ /uploads   │ │   API      │                              │
│  └────────────┘ └────────────┘ └────────────┘                              │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Step 1: Create Asset Provider Interface & Types**

```typescript
// apps/backend/src/modules/gamification/providers/asset-provider.interface.ts

import { GachaPool, GachaItem, RarityTier } from "@prisma/client";

export interface AssetProviderConfig {
  priority: number; // Lower = higher priority for fallback
  enabled: boolean;
  timeout?: number; // Request timeout in ms
  retryAttempts?: number;
}

export interface AssetItem {
  id: string;
  name: string;
  imageUrl: string;
  rarity: RarityTier;
  weight: number; // For weighted random selection
  metadata?: Record<string, any>;
}

export interface IAssetProvider {
  readonly name: string;
  readonly config: AssetProviderConfig;

  /**
   * Fetch available items for a pool
   */
  getItems(pool: GachaPool, limit?: number): Promise<AssetItem[]>;

  /**
   * Get direct URL for an item (handles transformation if needed)
   */
  getItemUrl(item: AssetItem, options?: ImageTransformOptions): string;

  /**
   * Validate item is still accessible
   */
  validateItem(item: AssetItem): Promise<boolean>;

  /**
   * Check if provider is healthy
   */
  healthCheck(): Promise<ProviderHealthStatus>;
}

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: "auto" | "webp" | "jpg" | "png";
}

export interface ProviderHealthStatus {
  healthy: boolean;
  latency: number;
  lastChecked: Date;
  error?: string;
}

export enum AssetProviderType {
  WALLHAVEN = "wallhaven",
  LOCAL = "local",
  CLOUDINARY = "cloudinary",
}
```

**Step 2: Implement Local Asset Provider**

```typescript
// apps/backend/src/modules/gamification/providers/local-asset.provider.ts

import { Injectable, Logger } from "@nestjs/common";
import { GachaPool, RarityTier } from "@prisma/client";
import { promises as fs } from "fs";
import * as path from "path";
import {
  IAssetProvider,
  AssetProviderConfig,
  AssetItem,
  ImageTransformOptions,
  ProviderHealthStatus,
} from "./asset-provider.interface";

interface LocalAssetMetadata {
  filename: string;
  rarity: RarityTier;
  weight: number;
  name?: string;
}

@Injectable()
export class LocalAssetProvider implements IAssetProvider {
  readonly name = "LocalAssetProvider";
  readonly config: AssetProviderConfig = {
    priority: 1, // Highest priority - check local first
    enabled: true,
    timeout: 5000,
    retryAttempts: 2,
  };

  private readonly logger = new Logger(LocalAssetProvider.name);
  private readonly basePath: string;
  private readonly baseUrl: string;

  constructor() {
    // Store assets in backend public directory
    this.basePath = path.join(process.cwd(), "public", "gacha");
    this.baseUrl = process.env.BACKEND_URL || "http://localhost:3001";
  }

  async getItems(pool: GachaPool, limit: number = 24): Promise<AssetItem[]> {
    const poolPath = path.join(this.basePath, pool.id);

    try {
      // Ensure directory exists
      await fs.mkdir(poolPath, { recursive: true });

      // Read directory contents
      const files = await fs.readdir(poolPath);
      const imageFiles = files.filter((f) =>
        /\.(jpg|jpeg|png|webp|gif)$/i.test(f),
      );

      // Load metadata file if exists
      const metadataPath = path.join(poolPath, "metadata.json");
      let metadata: Record<string, LocalAssetMetadata> = {};

      try {
        const metadataContent = await fs.readFile(metadataPath, "utf-8");
        metadata = JSON.parse(metadataContent);
      } catch {
        this.logger.warn(
          `No metadata.json found for pool ${pool.id}, using defaults`,
        );
      }

      // Map to AssetItems
      const items: AssetItem[] = imageFiles
        .slice(0, limit)
        .map((filename, index) => {
          const fileMetadata = metadata[filename] || {};

          return {
            id: `local-${pool.id}-${filename}`,
            name: fileMetadata.name || `Item #${index + 1}`,
            imageUrl: this.getItemUrl({
              id: "",
              imageUrl: filename,
              name: "",
              rarity: RarityTier.COMMON,
              weight: 1,
            }),
            rarity:
              fileMetadata.rarity || this.inferRarityFromFilename(filename),
            weight: fileMetadata.weight || 1,
            metadata: {
              filename,
              source: "local",
              poolId: pool.id,
            },
          };
        });

      this.logger.log(`Found ${items.length} local assets for pool ${pool.id}`);
      return items;
    } catch (error) {
      this.logger.error(
        `Failed to load local assets for pool ${pool.id}:`,
        error,
      );
      return [];
    }
  }

  getItemUrl(item: AssetItem, options?: ImageTransformOptions): string {
    const poolId = item.metadata?.poolId || "default";
    const filename = item.metadata?.filename || item.imageUrl;

    // Build URL to static file endpoint
    return `${this.baseUrl}/gacha/${poolId}/${filename}`;
  }

  async validateItem(item: AssetItem): Promise<boolean> {
    try {
      const poolId = item.metadata?.poolId || "default";
      const filename = item.metadata?.filename;
      const filePath = path.join(this.basePath, poolId, filename);

      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();

    try {
      await fs.access(this.basePath);
      return {
        healthy: true,
        latency: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        lastChecked: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Infer rarity from filename patterns (e.g., "legendary_item_01.jpg")
   */
  private inferRarityFromFilename(filename: string): RarityTier {
    const lower = filename.toLowerCase();
    if (lower.includes("legendary")) return RarityTier.LEGENDARY;
    if (lower.includes("epic")) return RarityTier.EPIC;
    if (lower.includes("rare")) return RarityTier.RARE;
    if (lower.includes("uncommon")) return RarityTier.UNCOMMON;
    return RarityTier.COMMON;
  }

  /**
   * Admin utility: Save metadata for pool
   */
  async savePoolMetadata(
    poolId: string,
    metadata: Record<string, LocalAssetMetadata>,
  ): Promise<void> {
    const metadataPath = path.join(this.basePath, poolId, "metadata.json");
    await fs.mkdir(path.dirname(metadataPath), { recursive: true });
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    this.logger.log(`Saved metadata for pool ${poolId}`);
  }
}
```

**Step 3: Implement Cloudinary Asset Provider**

```typescript
// apps/backend/src/modules/gamification/providers/cloudinary-asset.provider.ts

import { Injectable, Logger } from "@nestjs/common";
import { GachaPool, RarityTier } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import {
  IAssetProvider,
  AssetProviderConfig,
  AssetItem,
  ImageTransformOptions,
  ProviderHealthStatus,
} from "./asset-provider.interface";

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
}

@Injectable()
export class CloudinaryAssetProvider implements IAssetProvider {
  readonly name = "CloudinaryAssetProvider";
  readonly config: AssetProviderConfig = {
    priority: 2, // Check after local, before Wallhaven
    enabled: true,
    timeout: 10000,
    retryAttempts: 3,
  };

  private readonly logger = new Logger(CloudinaryAssetProvider.name);
  private readonly folder: string;
  private readonly isConfigured: boolean;

  constructor() {
    const config: CloudinaryConfig = {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
      apiKey: process.env.CLOUDINARY_API_KEY || "",
      apiSecret: process.env.CLOUDINARY_API_SECRET || "",
      folder: process.env.CLOUDINARY_GACHA_FOLDER || "gacha",
    };

    this.isConfigured = !!(
      config.cloudName &&
      config.apiKey &&
      config.apiSecret
    );
    this.folder = config.folder;

    if (this.isConfigured) {
      cloudinary.config({
        cloud_name: config.cloudName,
        api_key: config.apiKey,
        api_secret: config.apiSecret,
      });
      this.logger.log("Cloudinary provider initialized");
    } else {
      this.logger.warn("Cloudinary not configured, provider disabled");
    }
  }

  async getItems(pool: GachaPool, limit: number = 24): Promise<AssetItem[]> {
    if (!this.isConfigured) {
      return [];
    }

    try {
      const folderPath = `${this.folder}/${pool.id}`;

      // Fetch resources from Cloudinary
      const result = await cloudinary.api.resources({
        type: "upload",
        prefix: folderPath,
        max_results: limit,
        context: true, // Fetch metadata (rarity, weight)
        tags: true,
      });

      const items: AssetItem[] = result.resources.map((resource: any) => {
        // Parse context metadata
        const context = resource.context || {};
        const rarity = this.parseRarity(context.rarity);
        const weight = parseInt(context.weight) || 1;
        const name = context.name || resource.public_id.split("/").pop();

        return {
          id: `cloudinary-${resource.asset_id}`,
          name,
          imageUrl: resource.secure_url,
          rarity,
          weight,
          metadata: {
            publicId: resource.public_id,
            format: resource.format,
            bytes: resource.bytes,
            source: "cloudinary",
            poolId: pool.id,
            tags: resource.tags || [],
          },
        };
      });

      this.logger.log(
        `Fetched ${items.length} Cloudinary assets for pool ${pool.id}`,
      );
      return items;
    } catch (error) {
      this.logger.error(
        `Failed to fetch Cloudinary assets for pool ${pool.id}:`,
        error,
      );
      return [];
    }
  }

  getItemUrl(item: AssetItem, options?: ImageTransformOptions): string {
    const publicId = item.metadata?.publicId;

    if (!publicId) {
      return item.imageUrl; // Fallback to stored URL
    }

    // Build transformation options
    const transformation: any = {};

    if (options?.width) transformation.width = options.width;
    if (options?.height) transformation.height = options.height;
    if (options?.quality) transformation.quality = options.quality;
    if (options?.format && options.format !== "auto") {
      transformation.fetch_format = options.format;
    }

    // Generate optimized URL
    return cloudinary.url(publicId, {
      secure: true,
      transformation:
        Object.keys(transformation).length > 0 ? [transformation] : undefined,
    });
  }

  async validateItem(item: AssetItem): Promise<boolean> {
    if (!this.isConfigured || !item.metadata?.publicId) {
      return false;
    }

    try {
      await cloudinary.api.resource(item.metadata.publicId);
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();

    if (!this.isConfigured) {
      return {
        healthy: false,
        latency: 0,
        lastChecked: new Date(),
        error: "Cloudinary not configured",
      };
    }

    try {
      await cloudinary.api.ping();
      return {
        healthy: true,
        latency: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        lastChecked: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Upload image to Cloudinary with metadata
   */
  async uploadImage(
    poolId: string,
    filePath: string,
    metadata: {
      name: string;
      rarity: RarityTier;
      weight: number;
    },
  ): Promise<AssetItem> {
    if (!this.isConfigured) {
      throw new Error("Cloudinary not configured");
    }

    const publicId = `${this.folder}/${poolId}/${Date.now()}-${path.basename(filePath, path.extname(filePath))}`;

    const result = await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      folder: "",
      context: {
        name: metadata.name,
        rarity: metadata.rarity,
        weight: metadata.weight.toString(),
        poolId,
      },
      tags: [`pool-${poolId}`, metadata.rarity.toLowerCase()],
    });

    return {
      id: `cloudinary-${result.asset_id}`,
      name: metadata.name,
      imageUrl: result.secure_url,
      rarity: metadata.rarity,
      weight: metadata.weight,
      metadata: {
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
        source: "cloudinary",
        poolId,
      },
    };
  }

  /**
   * Update image metadata (rarity, weight, name)
   */
  async updateMetadata(
    publicId: string,
    metadata: {
      name?: string;
      rarity?: RarityTier;
      weight?: number;
    },
  ): Promise<void> {
    if (!this.isConfigured) {
      throw new Error("Cloudinary not configured");
    }

    const context: any = {};
    if (metadata.name) context.name = metadata.name;
    if (metadata.rarity) context.rarity = metadata.rarity;
    if (metadata.weight !== undefined)
      context.weight = metadata.weight.toString();

    await cloudinary.api.update(publicId, { context });

    // Update tags if rarity changed
    if (metadata.rarity) {
      await cloudinary.uploader.replace_tag(
        [metadata.rarity.toLowerCase()],
        [publicId],
      );
    }
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error("Cloudinary not configured");
    }

    await cloudinary.uploader.destroy(publicId);
  }

  private parseRarity(rarityString?: string): RarityTier {
    if (!rarityString) return RarityTier.COMMON;

    const normalized = rarityString.toUpperCase();
    if (normalized in RarityTier) {
      return RarityTier[normalized as keyof typeof RarityTier];
    }

    return RarityTier.COMMON;
  }
}
```

**Step 4: Implement Wallhaven Asset Provider (Refactored)**

```typescript
// apps/backend/src/modules/gamification/providers/wallhaven-asset.provider.ts

import { Injectable, Logger } from "@nestjs/common";
import { GachaPool, RarityTier } from "@prisma/client";
import axios from "axios";
import {
  IAssetProvider,
  AssetProviderConfig,
  AssetItem,
  ImageTransformOptions,
  ProviderHealthStatus,
} from "./asset-provider.interface";

interface WallhavenImage {
  id: string;
  url: string;
  thumbs: { original: string };
  resolution: string;
}

interface WallhavenResponse {
  data: WallhavenImage[];
}

@Injectable()
export class WallhavenAssetProvider implements IAssetProvider {
  readonly name = "WallhavenAssetProvider";
  readonly config: AssetProviderConfig = {
    priority: 3, // Lowest priority - fallback only
    enabled: true,
    timeout: 10000,
    retryAttempts: 2,
  };

  private readonly logger = new Logger(WallhavenAssetProvider.name);
  private readonly apiUrl = "https://wallhaven.cc/api/v1/search";
  private readonly cache = new Map<
    string,
    { items: AssetItem[]; timestamp: number }
  >();
  private readonly cacheTtl = 1000 * 60 * 30; // 30 minutes

  async getItems(pool: GachaPool, limit: number = 24): Promise<AssetItem[]> {
    const cacheKey = `${pool.id}-${pool.wallhavenTags}-${limit}`;
    const cached = this.cache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      this.logger.debug(`Returning cached Wallhaven data for pool ${pool.id}`);
      return cached.items;
    }

    try {
      const response = await axios.get<WallhavenResponse>(this.apiUrl, {
        params: {
          q: pool.wallhavenTags || "anime",
          sorting: "random",
          purity: "100", // SFW only
          page: 1,
        },
        headers: {
          ...(process.env.WALLHAVEN_API_KEY && {
            "X-API-Key": process.env.WALLHAVEN_API_KEY,
          }),
        },
        timeout: this.config.timeout,
      });

      const images: WallhavenImage[] = response.data.data.slice(0, limit);

      // Assign weighted random rarities
      const items: AssetItem[] = images.map((img, index) => ({
        id: `wallhaven-${img.id}`,
        name: `Wallpaper #${img.id}`,
        imageUrl: img.thumbs.original,
        rarity: this.assignRandomRarity(),
        weight: 1,
        metadata: {
          source: "wallhaven",
          poolId: pool.id,
          originalUrl: img.url,
          resolution: img.resolution,
        },
      }));

      // Update cache
      this.cache.set(cacheKey, { items, timestamp: Date.now() });

      this.logger.log(
        `Fetched ${items.length} Wallhaven images for pool ${pool.id}`,
      );
      return items;
    } catch (error) {
      this.logger.error(
        `Failed to fetch from Wallhaven for pool ${pool.id}:`,
        error,
      );

      // Return expired cache as fallback
      if (cached) {
        this.logger.warn(`Using expired cache as fallback for pool ${pool.id}`);
        return cached.items;
      }

      throw new Error(
        `Unable to fetch gacha items from Wallhaven: ${error.message}`,
      );
    }
  }

  getItemUrl(item: AssetItem, options?: ImageTransformOptions): string {
    // Wallhaven doesn't support on-the-fly transformations
    // Return the stored thumbnail URL
    return item.imageUrl;
  }

  async validateItem(item: AssetItem): Promise<boolean> {
    try {
      // Check if image URL is accessible
      const response = await axios.head(item.imageUrl, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();

    try {
      const response = await axios.get(this.apiUrl, {
        params: { q: "test", page: 1 },
        headers: {
          ...(process.env.WALLHAVEN_API_KEY && {
            "X-API-Key": process.env.WALLHAVEN_API_KEY,
          }),
        },
        timeout: 5000,
      });

      return {
        healthy: response.status === 200,
        latency: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        lastChecked: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Clear cache for specific pool or all pools
   */
  clearCache(poolId?: string): void {
    if (poolId) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(poolId)) {
          this.cache.delete(key);
        }
      }
      this.logger.log(`Cleared Wallhaven cache for pool ${poolId}`);
    } else {
      this.cache.clear();
      this.logger.log("Cleared all Wallhaven cache");
    }
  }

  private assignRandomRarity(): RarityTier {
    const rand = Math.random() * 100;
    if (rand < 60) return RarityTier.COMMON;
    if (rand < 85) return RarityTier.UNCOMMON;
    if (rand < 95) return RarityTier.RARE;
    if (rand < 99) return RarityTier.EPIC;
    return RarityTier.LEGENDARY;
  }
}
```

**Step 5: Create Asset Provider Registry**

```typescript
// apps/backend/src/modules/gamification/providers/asset-provider.registry.ts

import { Injectable, Logger } from "@nestjs/common";
import { GachaPool } from "@prisma/client";
import {
  IAssetProvider,
  AssetItem,
  ProviderHealthStatus,
} from "./asset-provider.interface";
import { LocalAssetProvider } from "./local-asset.provider";
import { CloudinaryAssetProvider } from "./cloudinary-asset.provider";
import { WallhavenAssetProvider } from "./wallhaven-asset.provider";

export enum AssetSource {
  LOCAL = "local",
  CLOUDINARY = "cloudinary",
  WALLHAVEN = "wallhaven",
}

@Injectable()
export class AssetProviderRegistry {
  private readonly logger = new Logger(AssetProviderRegistry.name);
  private readonly providers: Map<AssetSource, IAssetProvider> = new Map();

  constructor(
    private readonly localProvider: LocalAssetProvider,
    private readonly cloudinaryProvider: CloudinaryAssetProvider,
    private readonly wallhavenProvider: WallhavenAssetProvider,
  ) {
    this.providers.set(AssetSource.LOCAL, localProvider);
    this.providers.set(AssetSource.CLOUDINARY, cloudinaryProvider);
    this.providers.set(AssetSource.WALLHAVEN, wallhavenProvider);
  }

  /**
   * Get items from all enabled providers with fallback chain
   */
  async getItems(
    pool: GachaPool,
    sources: AssetSource[] = [
      AssetSource.LOCAL,
      AssetSource.CLOUDINARY,
      AssetSource.WALLHAVEN,
    ],
    limit: number = 24,
  ): Promise<AssetItem[]> {
    const allItems: AssetItem[] = [];
    const errors: string[] = [];

    for (const source of sources) {
      const provider = this.providers.get(source);

      if (!provider) {
        this.logger.warn(`Provider not found for source: ${source}`);
        continue;
      }

      if (!provider.config.enabled) {
        this.logger.debug(`Provider ${provider.name} is disabled`);
        continue;
      }

      try {
        const items = await provider.getItems(pool, limit);

        if (items.length > 0) {
          // Tag items with their source
          const taggedItems = items.map((item) => ({
            ...item,
            metadata: {
              ...item.metadata,
              providerSource: source,
            },
          }));

          allItems.push(...taggedItems);

          // If we have enough items, stop fetching
          if (allItems.length >= limit) {
            break;
          }
        }
      } catch (error) {
        const errorMsg = `${provider.name} failed: ${error.message}`;
        this.logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    if (allItems.length === 0 && errors.length > 0) {
      throw new Error(`All asset providers failed:\n${errors.join("\n")}`);
    }

    // Return up to limit, shuffled for variety
    return this.shuffleArray(allItems).slice(0, limit);
  }

  /**
   * Get URL for an item with transformations
   */
  getItemUrl(item: AssetItem, options?: any): string {
    const source = item.metadata?.providerSource as AssetSource;
    const provider = source ? this.providers.get(source) : null;

    if (provider) {
      return provider.getItemUrl(item, options);
    }

    // Fallback to stored URL
    return item.imageUrl;
  }

  /**
   * Health check all providers
   */
  async healthCheck(): Promise<Record<AssetSource, ProviderHealthStatus>> {
    const results: Partial<Record<AssetSource, ProviderHealthStatus>> = {};

    for (const [source, provider] of this.providers) {
      results[source] = await provider.healthCheck();
    }

    return results as Record<AssetSource, ProviderHealthStatus>;
  }

  /**
   * Get specific provider by source
   */
  getProvider(source: AssetSource): IAssetProvider | undefined {
    return this.providers.get(source);
  }

  /**
   * Clear caches for all or specific provider
   */
  clearCache(source?: AssetSource, poolId?: string): void {
    if (source) {
      const provider = this.providers.get(source);
      if (provider && "clearCache" in provider) {
        (provider as any).clearCache(poolId);
      }
    } else {
      for (const [, provider] of this.providers) {
        if ("clearCache" in provider) {
          (provider as any).clearCache(poolId);
        }
      }
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
```

#### 2.1.4 Implementation: Admin Configuration System

**Step 1: Extend Database Schema for Admin Configuration**

```prisma
// apps/backend/prisma/schema.prisma - Additions

// Rarity Weight Configuration (Admin-configurable per pool)
model PoolRarityConfig {
  id          String     @id @default(cuid())
  poolId      String
  pool        GachaPool  @relation(fields: [poolId], references: [id], onDelete: Cascade)

  rarity      RarityTier
  weight      Int        @default(1)  // Relative weight (e.g., 60 for COMMON, 1 for LEGENDARY)
  probability Float?     // Precalculated probability (0-1)

  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@unique([poolId, rarity])
  @@index([poolId])
}

// Cloudinary Asset Registry (tracks manually added Cloudinary assets)
model CloudinaryAsset {
  id          String     @id @default(cuid())

  // Cloudinary identifiers
  publicId    String     @unique
  secureUrl   String

  // Pool assignment
  poolId      String
  pool        GachaPool  @relation(fields: [poolId], references: [id], onDelete: Cascade)

  // Metadata
  name        String
  rarity      RarityTier @default(COMMON)
  weight      Int        @default(1)

  // Admin tracking
  uploadedBy  String
  uploadedAt  DateTime   @default(now())

  // Optional tags for organization
  tags        String[]   @default([])

  @@index([poolId, rarity])
  @@index([uploadedBy])
  @@index([uploadedAt])
}

// Update GachaPool to track source preferences
model GachaPool {
  // ... existing fields ...

  // Source priority configuration (JSON array of source types)
  sourcePriority Json?   @default("[\"local\", \"cloudinary\", \"wallhaven\"]")

  // Enable/disable sources
  enableLocal      Boolean @default(true)
  enableCloudinary Boolean @default(false)  // Disabled by default, admin must enable
  enableWallhaven  Boolean @default(true)

  // Relations
  poolRarityConfigs PoolRarityConfig[]
  cloudinaryAssets CloudinaryAsset[]
}
```

**Step 2: Create Admin Controller**

```typescript
// apps/backend/src/modules/gamification/controllers/gacha-admin.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { RolesGuard } from "@common/guards/role.guard";
import { Roles } from "@core/decorators/roles.decorator";
import { UserRole } from "@prisma/client";
import { GachaAdminService } from "../services/gacha-admin.service";
import {
  CreatePoolDto,
  UpdatePoolDto,
  AddCloudinaryAssetDto,
  UpdateRarityConfigDto,
  UpdateAssetMetadataDto,
} from "../dto/gacha-admin.dto";
import { ApiTags, ApiConsumes, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("gacha-admin")
@Controller("gacha/admin")
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class GachaAdminController {
  constructor(private readonly adminService: GachaAdminService) {}

  // ═══════════════════════════════════════════════════════════════
  // Pool Management
  // ═══════════════════════════════════════════════════════════════

  @Post("pools")
  async createPool(@Body() dto: CreatePoolDto) {
    return this.adminService.createPool(dto);
  }

  @Get("pools")
  async getAllPools() {
    return this.adminService.getAllPools();
  }

  @Get("pools/:poolId")
  async getPoolDetails(@Param("poolId") poolId: string) {
    return this.adminService.getPoolDetails(poolId);
  }

  @Put("pools/:poolId")
  async updatePool(
    @Param("poolId") poolId: string,
    @Body() dto: UpdatePoolDto,
  ) {
    return this.adminService.updatePool(poolId, dto);
  }

  @Delete("pools/:poolId")
  async deletePool(@Param("poolId") poolId: string) {
    return this.adminService.deletePool(poolId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Rarity Configuration
  // ═══════════════════════════════════════════════════════════════

  @Get("pools/:poolId/rarity-config")
  async getRarityConfig(@Param("poolId") poolId: string) {
    return this.adminService.getRarityConfig(poolId);
  }

  @Put("pools/:poolId/rarity-config")
  async updateRarityConfig(
    @Param("poolId") poolId: string,
    @Body() dto: UpdateRarityConfigDto,
  ) {
    return this.adminService.updateRarityConfig(poolId, dto.configs);
  }

  // ═══════════════════════════════════════════════════════════════
  // Cloudinary Asset Management
  // ═══════════════════════════════════════════════════════════════

  @Get("pools/:poolId/cloudinary-assets")
  async getCloudinaryAssets(@Param("poolId") poolId: string) {
    return this.adminService.getCloudinaryAssets(poolId);
  }

  @Post("pools/:poolId/cloudinary-assets/url")
  async addCloudinaryAssetByUrl(
    @Param("poolId") poolId: string,
    @Body() dto: AddCloudinaryAssetDto,
    @ActiveUser("id") adminId: string,
  ) {
    return this.adminService.addCloudinaryAssetByUrl(poolId, dto, adminId);
  }

  @Post("pools/:poolId/cloudinary-assets/upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  async uploadCloudinaryAsset(
    @Param("poolId") poolId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdateAssetMetadataDto,
    @ActiveUser("id") adminId: string,
  ) {
    return this.adminService.uploadCloudinaryAsset(poolId, file, dto, adminId);
  }

  @Put("cloudinary-assets/:assetId")
  async updateCloudinaryAsset(
    @Param("assetId") assetId: string,
    @Body() dto: UpdateAssetMetadataDto,
  ) {
    return this.adminService.updateCloudinaryAsset(assetId, dto);
  }

  @Delete("cloudinary-assets/:assetId")
  async deleteCloudinaryAsset(@Param("assetId") assetId: string) {
    return this.adminService.deleteCloudinaryAsset(assetId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Local Asset Management
  // ═══════════════════════════════════════════════════════════════

  @Get("pools/:poolId/local-assets")
  async getLocalAssets(@Param("poolId") poolId: string) {
    return this.adminService.getLocalAssets(poolId);
  }

  @Post("pools/:poolId/local-assets/upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  async uploadLocalAsset(
    @Param("poolId") poolId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdateAssetMetadataDto,
  ) {
    return this.adminService.uploadLocalAsset(poolId, file, dto);
  }

  @Put("local-assets/:assetId/metadata")
  async updateLocalAssetMetadata(
    @Param("assetId") assetId: string,
    @Body() dto: UpdateAssetMetadataDto,
  ) {
    return this.adminService.updateLocalAssetMetadata(assetId, dto);
  }

  @Delete("local-assets/:assetId")
  async deleteLocalAsset(@Param("assetId") assetId: string) {
    return this.adminService.deleteLocalAsset(assetId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Provider Health & Diagnostics
  // ═══════════════════════════════════════════════════════════════

  @Get("health")
  async getProviderHealth() {
    return this.adminService.getProviderHealth();
  }

  @Post("cache/clear")
  async clearCache(
    @Query("source") source?: string,
    @Query("poolId") poolId?: string,
  ) {
    return this.adminService.clearCache(source, poolId);
  }
}
```

**Step 3: Create Admin Service**

```typescript
// apps/backend/src/modules/gamification/services/gacha-admin.service.ts

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@core/prisma/prisma.service";
import { GachaPool, RarityTier, Prisma } from "@prisma/client";
import {
  AssetProviderRegistry,
  AssetSource,
} from "../providers/asset-provider.registry";
import { CloudinaryAssetProvider } from "../providers/cloudinary-asset.provider";
import { LocalAssetProvider } from "../providers/local-asset.provider";
import * as path from "path";
import * as fs from "fs/promises";

@Injectable()
export class GachaAdminService {
  private readonly logger = new Logger(GachaAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: AssetProviderRegistry,
    private readonly cloudinaryProvider: CloudinaryAssetProvider,
    private readonly localProvider: LocalAssetProvider,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // Pool Management
  // ═══════════════════════════════════════════════════════════════

  async createPool(data: {
    name: string;
    description?: string;
    type: "STANDARD" | "PREMIUM";
    cost: number;
    isAdminOnly?: boolean;
    wallhavenTags?: string;
    sourcePriority?: AssetSource[];
  }): Promise<GachaPool> {
    // Validate source priority
    const priority = data.sourcePriority || [
      AssetSource.LOCAL,
      AssetSource.CLOUDINARY,
      AssetSource.WALLHAVEN,
    ];

    const pool = await this.prisma.gachaPool.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        cost: data.cost,
        isAdminOnly: data.isAdminOnly ?? false,
        wallhavenTags: data.wallhavenTags,
        sourcePriority: priority as any,
        enableLocal: priority.includes(AssetSource.LOCAL),
        enableCloudinary: priority.includes(AssetSource.CLOUDINARY),
        enableWallhaven: priority.includes(AssetSource.WALLHAVEN),
      },
    });

    // Create default rarity configs
    await this.createDefaultRarityConfigs(pool.id);

    this.logger.log(`Created gacha pool: ${pool.id} - ${pool.name}`);
    return pool;
  }

  async getAllPools(): Promise<GachaPool[]> {
    return this.prisma.gachaPool.findMany({
      include: {
        _count: { select: { items: true, cloudinaryAssets: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getPoolDetails(poolId: string) {
    const pool = await this.prisma.gachaPool.findUnique({
      where: { id: poolId },
      include: {
        poolRarityConfigs: { orderBy: { rarity: "asc" } },
        _count: {
          select: { items: true, cloudinaryAssets: true, gachaPulls: true },
        },
      },
    });

    if (!pool) throw new NotFoundException("Pool not found");

    return pool;
  }

  async updatePool(
    poolId: string,
    data: Partial<GachaPool> & { sourcePriority?: AssetSource[] },
  ): Promise<GachaPool> {
    const updateData: any = { ...data };

    if (data.sourcePriority) {
      updateData.sourcePriority = data.sourcePriority as any;
      updateData.enableLocal = data.sourcePriority.includes(AssetSource.LOCAL);
      updateData.enableCloudinary = data.sourcePriority.includes(
        AssetSource.CLOUDINARY,
      );
      updateData.enableWallhaven = data.sourcePriority.includes(
        AssetSource.WALLHAVEN,
      );
      delete updateData.sourcePriority;
    }

    return this.prisma.gachaPool.update({
      where: { id: poolId },
      data: updateData,
    });
  }

  async deletePool(poolId: string): Promise<void> {
    // Delete associated Cloudinary assets
    const cloudinaryAssets = await this.prisma.cloudinaryAsset.findMany({
      where: { poolId },
    });

    for (const asset of cloudinaryAssets) {
      try {
        await this.cloudinaryProvider.deleteImage(asset.publicId);
      } catch (error) {
        this.logger.warn(
          `Failed to delete Cloudinary asset ${asset.publicId}:`,
          error,
        );
      }
    }

    // Pool deletion will cascade to related records via Prisma relations
    await this.prisma.gachaPool.delete({ where: { id: poolId } });
    this.logger.log(`Deleted gacha pool: ${poolId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // Rarity Configuration
  // ═══════════════════════════════════════════════════════════════

  async getRarityConfig(poolId: string) {
    const configs = await this.prisma.poolRarityConfig.findMany({
      where: { poolId },
      orderBy: { rarity: "asc" },
    });

    // Calculate probabilities
    const totalWeight = configs.reduce((sum, c) => sum + c.weight, 0);

    return configs.map((config) => ({
      ...config,
      probability: config.weight / totalWeight,
      percentage: ((config.weight / totalWeight) * 100).toFixed(2) + "%",
    }));
  }

  async updateRarityConfig(
    poolId: string,
    configs: Array<{ rarity: RarityTier; weight: number }>,
  ) {
    // Validate all rarities are provided
    const allRarities = Object.values(RarityTier);
    const providedRarities = configs.map((c) => c.rarity);

    if (providedRarities.length !== allRarities.length) {
      throw new BadRequestException(
        `Must provide weights for all ${allRarities.length} rarities`,
      );
    }

    // Validate weights are positive
    if (configs.some((c) => c.weight <= 0)) {
      throw new BadRequestException("All weights must be positive integers");
    }

    // Calculate probabilities
    const totalWeight = configs.reduce((sum, c) => sum + c.weight, 0);

    // Upsert configs
    await this.prisma.$transaction(
      configs.map((config) =>
        this.prisma.poolRarityConfig.upsert({
          where: {
            poolId_rarity: { poolId, rarity: config.rarity },
          },
          update: {
            weight: config.weight,
            probability: config.weight / totalWeight,
          },
          create: {
            poolId,
            rarity: config.rarity,
            weight: config.weight,
            probability: config.weight / totalWeight,
          },
        }),
      ),
    );

    this.logger.log(`Updated rarity config for pool ${poolId}`);
    return this.getRarityConfig(poolId);
  }

  private async createDefaultRarityConfigs(poolId: string) {
    const defaultWeights = [
      { rarity: RarityTier.COMMON, weight: 60 },
      { rarity: RarityTier.UNCOMMON, weight: 25 },
      { rarity: RarityTier.RARE, weight: 10 },
      { rarity: RarityTier.EPIC, weight: 4 },
      { rarity: RarityTier.LEGENDARY, weight: 1 },
    ];

    const totalWeight = defaultWeights.reduce((sum, w) => sum + w.weight, 0);

    await this.prisma.poolRarityConfig.createMany({
      data: defaultWeights.map((w) => ({
        poolId,
        rarity: w.rarity,
        weight: w.weight,
        probability: w.weight / totalWeight,
      })),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Cloudinary Asset Management
  // ═══════════════════════════════════════════════════════════════

  async addCloudinaryAssetByUrl(
    poolId: string,
    data: {
      publicId: string;
      name: string;
      rarity: RarityTier;
      weight?: number;
      tags?: string[];
    },
    adminId: string,
  ) {
    // Validate pool exists
    const pool = await this.prisma.gachaPool.findUnique({
      where: { id: poolId },
    });
    if (!pool) throw new NotFoundException("Pool not found");

    // Get image details from Cloudinary
    let assetDetails;
    try {
      assetDetails = await this.cloudinaryProvider["getImageDetails"](
        data.publicId,
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch image details from Cloudinary: ${error.message}`,
      );
    }

    // Create record
    const asset = await this.prisma.cloudinaryAsset.create({
      data: {
        publicId: data.publicId,
        secureUrl: assetDetails.secureUrl,
        poolId,
        name: data.name,
        rarity: data.rarity,
        weight: data.weight ?? 1,
        uploadedBy: adminId,
        tags: data.tags || [],
      },
    });

    // Update Cloudinary metadata
    await this.cloudinaryProvider.updateMetadata(data.publicId, {
      name: data.name,
      rarity: data.rarity,
      weight: data.weight ?? 1,
    });

    this.logger.log(
      `Added Cloudinary asset ${data.publicId} to pool ${poolId}`,
    );
    return asset;
  }

  async uploadCloudinaryAsset(
    poolId: string,
    file: Express.Multer.File,
    metadata: {
      name: string;
      rarity: RarityTier;
      weight?: number;
      tags?: string[];
    },
    adminId: string,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    // Validate image
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        "Invalid file type. Allowed: JPG, PNG, WebP, GIF",
      );
    }

    // Upload to Cloudinary
    const uploadedItem = await this.cloudinaryProvider.uploadImage(
      poolId,
      file.path,
      {
        name: metadata.name,
        rarity: metadata.rarity,
        weight: metadata.weight ?? 1,
      },
    );

    // Create database record
    const asset = await this.prisma.cloudinaryAsset.create({
      data: {
        publicId: uploadedItem.metadata.publicId,
        secureUrl: uploadedItem.imageUrl,
        poolId,
        name: metadata.name,
        rarity: metadata.rarity,
        weight: metadata.weight ?? 1,
        uploadedBy: adminId,
        tags: metadata.tags || [],
      },
    });

    // Clean up temp file
    try {
      await fs.unlink(file.path);
    } catch {
      // Ignore cleanup errors
    }

    this.logger.log(
      `Uploaded Cloudinary asset to pool ${poolId}: ${asset.publicId}`,
    );
    return asset;
  }

  async updateCloudinaryAsset(
    assetId: string,
    data: {
      name?: string;
      rarity?: RarityTier;
      weight?: number;
      tags?: string[];
    },
  ) {
    const asset = await this.prisma.cloudinaryAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset) throw new NotFoundException("Asset not found");

    // Update Cloudinary metadata
    await this.cloudinaryProvider.updateMetadata(asset.publicId, {
      name: data.name,
      rarity: data.rarity,
      weight: data.weight,
    });

    // Update database record
    return this.prisma.cloudinaryAsset.update({
      where: { id: assetId },
      data: {
        name: data.name,
        rarity: data.rarity,
        weight: data.weight,
        tags: data.tags,
      },
    });
  }

  async deleteCloudinaryAsset(assetId: string) {
    const asset = await this.prisma.cloudinaryAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset) throw new NotFoundException("Asset not found");

    // Delete from Cloudinary
    try {
      await this.cloudinaryProvider.deleteImage(asset.publicId);
    } catch (error) {
      this.logger.warn(
        `Failed to delete from Cloudinary (may already be deleted):`,
        error,
      );
    }

    // Delete database record
    await this.prisma.cloudinaryAsset.delete({ where: { id: assetId } });
    this.logger.log(`Deleted Cloudinary asset: ${assetId}`);
  }

  async getCloudinaryAssets(poolId: string) {
    return this.prisma.cloudinaryAsset.findMany({
      where: { poolId },
      orderBy: { uploadedAt: "desc" },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Local Asset Management
  // ═══════════════════════════════════════════════════════════════

  async getLocalAssets(poolId: string) {
    const pool = await this.prisma.gachaPool.findUnique({
      where: { id: poolId },
    });
    if (!pool) throw new NotFoundException("Pool not found");

    return this.localProvider.getItems(pool);
  }

  async uploadLocalAsset(
    poolId: string,
    file: Express.Multer.File,
    metadata: {
      name?: string;
      rarity?: RarityTier;
      weight?: number;
    },
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    // Validate image
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        "Invalid file type. Allowed: JPG, PNG, WebP, GIF",
      );
    }

    // Move file to pool directory
    const poolDir = path.join(process.cwd(), "public", "gacha", poolId);
    await fs.mkdir(poolDir, { recursive: true });

    const fileName = `${Date.now()}-${file.originalname}`;
    const destPath = path.join(poolDir, fileName);

    await fs.rename(file.path, destPath);

    // Load existing metadata
    const metadataPath = path.join(poolDir, "metadata.json");
    let existingMetadata: any = {};
    try {
      const content = await fs.readFile(metadataPath, "utf-8");
      existingMetadata = JSON.parse(content);
    } catch {
      // No existing metadata
    }

    // Update metadata
    existingMetadata[fileName] = {
      filename: fileName,
      name: metadata.name || file.originalname,
      rarity: metadata.rarity || RarityTier.COMMON,
      weight: metadata.weight || 1,
      uploadedAt: new Date().toISOString(),
    };

    await fs.writeFile(metadataPath, JSON.stringify(existingMetadata, null, 2));

    this.logger.log(`Uploaded local asset to pool ${poolId}: ${fileName}`);
    return existingMetadata[fileName];
  }

  async updateLocalAssetMetadata(
    assetId: string,
    metadata: {
      name?: string;
      rarity?: RarityTier;
      weight?: number;
    },
  ) {
    // assetId format: "local-{poolId}-{filename}"
    const match = assetId.match(/^local-(.+)-(.+)$/);
    if (!match) {
      throw new BadRequestException("Invalid asset ID format");
    }

    const [, poolId, filename] = match;
    const metadataPath = path.join(
      process.cwd(),
      "public",
      "gacha",
      poolId,
      "metadata.json",
    );

    // Load and update metadata
    let existingMetadata: any = {};
    try {
      const content = await fs.readFile(metadataPath, "utf-8");
      existingMetadata = JSON.parse(content);
    } catch {
      throw new NotFoundException("Asset metadata not found");
    }

    if (!existingMetadata[filename]) {
      throw new NotFoundException("Asset not found");
    }

    existingMetadata[filename] = {
      ...existingMetadata[filename],
      ...metadata,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(metadataPath, JSON.stringify(existingMetadata, null, 2));
    return existingMetadata[filename];
  }

  async deleteLocalAsset(assetId: string) {
    const match = assetId.match(/^local-(.+)-(.+)$/);
    if (!match) {
      throw new BadRequestException("Invalid asset ID format");
    }

    const [, poolId, filename] = match;
    const filePath = path.join(
      process.cwd(),
      "public",
      "gacha",
      poolId,
      filename,
    );
    const metadataPath = path.join(
      process.cwd(),
      "public",
      "gacha",
      poolId,
      "metadata.json",
    );

    // Delete file
    try {
      await fs.unlink(filePath);
    } catch {
      // File may not exist
    }

    // Update metadata
    try {
      const content = await fs.readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(content);
      delete metadata[filename];
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch {
      // Metadata may not exist
    }

    this.logger.log(`Deleted local asset: ${assetId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // Provider Health & Diagnostics
  // ═══════════════════════════════════════════════════════════════

  async getProviderHealth() {
    return this.providerRegistry.healthCheck();
  }

  async clearCache(source?: string, poolId?: string) {
    this.providerRegistry.clearCache(source as AssetSource | undefined, poolId);

    return {
      message: "Cache cleared",
      source: source || "all",
      poolId: poolId || "all",
    };
  }
}
```

#### 2.1.5 Rarity-Weighted Pull Algorithm

**Algorithm Specification:**

```typescript
// apps/backend/src/modules/gamification/services/gacha-pull.service.ts

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@core/prisma/prisma.service";
import { GachaPool, RarityTier, Prisma } from "@prisma/client";
import { AssetProviderRegistry } from "../providers/asset-provider.registry";
import { AssetItem } from "../providers/asset-provider.interface";

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
      throw new Error("No items available in this pool");
    }

    // Filter out excluded items (for multi-pull without duplicates)
    const availableItems = excludeItemIds
      ? items.filter((item) => !excludeItemIds.includes(item.id))
      : items;

    if (availableItems.length === 0) {
      throw new Error("No remaining items available");
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
      throw new Error("No items available in this pool");
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

/**
 * Rarity Distribution Examples:
 *
 * Default Configuration:
 * - COMMON:    60/100 = 60.00%
 * - UNCOMMON:  25/100 = 25.00%
 * - RARE:      10/100 = 10.00%
 * - EPIC:       4/100 =  4.00%
 * - LEGENDARY:  1/100 =  1.00%
 *
 * Premium Pool Configuration (higher rare rates):
 * - COMMON:    30/100 = 30.00%
 * - UNCOMMON:  30/100 = 30.00%
 * - RARE:      25/100 = 25.00%
 * - EPIC:      10/100 = 10.00%
 * - LEGENDARY:  5/100 =  5.00%
 *
 * Legendary-Heavy Configuration:
 * - COMMON:    50/110 = 45.45%
 * - UNCOMMON:  25/110 = 22.73%
 * - RARE:      20/110 = 18.18%
 * - EPIC:      10/110 =  9.09%
 * - LEGENDARY:  5/110 =  4.55%
 */
```

### Section 2.2: Zero Breaking Changes Strategy

**Migration Plan for Seamless Transition:**

```typescript
// apps/backend/src/modules/gamification/services/gacha.service.ts - Updated

async pull(userId: string, poolId: string) {
  const pool = await this.prisma.gachaPool.findUnique({
    where: { id: poolId },
    include: {
      items: true,
      poolRarityConfigs: true, // NEW: Load rarity configs
    },
  });

  if (!pool || !pool.isActive) {
    throw new BadRequestException('Pool not found or inactive');
  }

  // ... existing validation code ...

  // Fetch items using new provider registry
  // FALLBACK: If new system fails, use legacy method
  let items: AssetItem[];
  try {
    items = await this.providerRegistry.getItems(pool);
  } catch (error) {
    this.logger.warn('Provider registry failed, using legacy fallback:', error);
    items = await this.legacyGetItems(pool); // Maintain backward compatibility
  }

  if (items.length === 0) {
    throw new BadRequestException('No items available in this pool');
  }

  // Use new weighted pull service
  let pulledItem: AssetItem;
  try {
    pulledItem = await this.pullService.executePull(pool);
  } catch (error) {
    this.logger.warn('Weighted pull failed, using legacy selection:', error);
    pulledItem = this.legacyWeightedSelection(items);
  }

  // ... rest of transaction ...
}
```

**API Contract Preservation:**

| Endpoint                | Request            | Response           | Change Status |
| ----------------------- | ------------------ | ------------------ | ------------- |
| `GET /gacha/pools`      | None               | `GachaPool[]`      | ✅ No Change  |
| `POST /gacha/pull`      | `{poolId: string}` | `PullResult`       | ✅ No Change  |
| `GET /gacha/collection` | None               | `CollectionItem[]` | ✅ No Change  |
| `GET /gacha/history`    | `?limit=50`        | `GachaPull[]`      | ✅ No Change  |

**Database Migration Strategy:**

```sql
-- Migration 1: Add new columns (nullable for zero-downtime)
ALTER TABLE "GachaPool"
ADD COLUMN IF NOT EXISTS "sourcePriority" JSONB,
ADD COLUMN IF NOT EXISTS "enableLocal" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "enableCloudinary" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "enableWallhaven" BOOLEAN DEFAULT true;

-- Migration 2: Create new tables
CREATE TABLE IF NOT EXISTS "PoolRarityConfig" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "poolId" TEXT NOT NULL REFERENCES "GachaPool"(id) ON DELETE CASCADE,
  rarity TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1,
  probability FLOAT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("poolId", rarity)
);

CREATE TABLE IF NOT EXISTS "CloudinaryAsset" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "publicId" TEXT UNIQUE NOT NULL,
  "secureUrl" TEXT NOT NULL,
  "poolId" TEXT NOT NULL REFERENCES "GachaPool"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL,
  weight INTEGER DEFAULT 1,
  "uploadedBy" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tags TEXT[] DEFAULT '{}'
);

-- Migration 3: Seed default rarity configs for existing pools
INSERT INTO "PoolRarityConfig" ("poolId", rarity, weight, probability)
SELECT
  gp.id as "poolId",
  rt.rarity,
  rt.weight,
  rt.weight::float / 100.0 as probability
FROM "GachaPool" gp
CROSS JOIN (VALUES
  ('COMMON', 60),
  ('UNCOMMON', 25),
  ('RARE', 10),
  ('EPIC', 4),
  ('LEGENDARY', 1)
) AS rt(rarity, weight)
ON CONFLICT ("poolId", rarity) DO NOTHING;
```

**Feature Flags for Gradual Rollout:**

```typescript
// apps/backend/src/config/feature-flags.ts

export const FeatureFlags = {
  // Enable new dual-source provider system
  DUAL_SOURCE_PROVIDER: process.env.FF_DUAL_SOURCE_PROVIDER === "true",

  // Enable Cloudinary integration
  CLOUDINARY_INTEGRATION: process.env.FF_CLOUDINARY_INTEGRATION === "true",

  // Enable admin rarity configuration
  ADMIN_RARITY_CONFIG: process.env.FF_ADMIN_RARITY_CONFIG === "true",

  // Enable weighted pull algorithm v2
  WEIGHTED_PULL_V2: process.env.FF_WEIGHTED_PULL_V2 === "true",
};

// Usage in service
if (FeatureFlags.DUAL_SOURCE_PROVIDER) {
  items = await this.providerRegistry.getItems(pool);
} else {
  items = await this.legacyGetItems(pool);
}
```

### Section 2.3: Full-Stack Type Integrity

**Backend DTOs:**

```typescript
// apps/backend/src/modules/gamification/dto/gacha-admin.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsUrl,
  Min,
  Max,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { RarityTier } from "@prisma/client";

export class CreatePoolDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(["STANDARD", "PREMIUM"])
  type: "STANDARD" | "PREMIUM";

  @IsNumber()
  @Min(1)
  cost: number;

  @IsOptional()
  @IsBoolean()
  isAdminOnly?: boolean;

  @IsString()
  @IsOptional()
  wallhavenTags?: string;

  @IsArray()
  @IsEnum(["local", "cloudinary", "wallhaven"], { each: true })
  @IsOptional()
  sourcePriority?: string[];
}

export class UpdatePoolDto extends PartialType(CreatePoolDto) {}

export class RarityConfigItemDto {
  @IsEnum(RarityTier)
  rarity: RarityTier;

  @IsNumber()
  @Min(1)
  weight: number;
}

export class UpdateRarityConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RarityConfigItemDto)
  configs: RarityConfigItemDto[];
}

export class AddCloudinaryAssetDto {
  @IsString()
  @IsNotEmpty()
  publicId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(RarityTier)
  rarity: RarityTier;

  @IsNumber()
  @IsOptional()
  @Min(1)
  weight?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class UpdateAssetMetadataDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(RarityTier)
  @IsOptional()
  rarity?: RarityTier;

  @IsNumber()
  @Min(1)
  @IsOptional()
  weight?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
```

**Frontend Types:**

```typescript
// apps/web/types/gacha.ts

export interface GachaPool {
  id: string;
  name: string;
  description: string | null;
  type: "STANDARD" | "PREMIUM";
  cost: number;
  isActive: boolean;
  isAdminOnly: boolean;
  wallhavenTags: string | null;
  sourcePriority: AssetSource[];
  enableLocal: boolean;
  enableCloudinary: boolean;
  enableWallhaven: boolean;
  _count: {
    items: number;
    cloudinaryAssets: number;
  };
}

export type AssetSource = "local" | "cloudinary" | "wallhaven";

export interface RarityConfig {
  id: string;
  poolId: string;
  rarity: RarityTier;
  weight: number;
  probability: number;
  percentage: string;
}

export type RarityTier = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";

export interface CloudinaryAsset {
  id: string;
  publicId: string;
  secureUrl: string;
  poolId: string;
  name: string;
  rarity: RarityTier;
  weight: number;
  uploadedBy: string;
  uploadedAt: string;
  tags: string[];
}

export interface LocalAsset {
  id: string;
  filename: string;
  name: string;
  rarity: RarityTier;
  weight: number;
  imageUrl: string;
  uploadedAt: string;
}

export interface ProviderHealth {
  healthy: boolean;
  latency: number;
  lastChecked: string;
  error?: string;
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

// ... existing types ...
```

### Section 2.4: Edge Case & Failure Mode Mitigation

**Failure Scenarios & Mitigations:**

| Scenario                           | Impact                    | Mitigation Strategy                                                                  |
| ---------------------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| **Wallhaven API Down**             | No STANDARD pool items    | Fallback to cached data (30min TTL) → Fallback to local assets if cache expired      |
| **Cloudinary API Down**            | No Cloudinary assets      | Skip Cloudinary provider, continue with local + Wallhaven                            |
| **Local Filesystem Error**         | No local assets           | Skip local provider, continue with Cloudinary + Wallhaven                            |
| **All Providers Fail**             | Complete service outage   | Return user-friendly error: "Gacha temporarily unavailable. Please try again later." |
| **Database Connection Lost**       | Cannot read pool config   | Implement retry with exponential backoff (3 attempts)                                |
| **Invalid Cloudinary URL**         | Broken images             | Validate URL on admin entry + periodic health checks                                 |
| **Rarity Config Missing**          | Cannot calculate weights  | Use default weights as fallback (60/25/10/4/1)                                       |
| **Concurrent Pull Race Condition** | Double currency deduction | Database transaction with row-level locking on user.currency                         |
| **Image Load Failure (Frontend)**  | Broken image display      | Implement onError handler to show placeholder                                        |

**Empty State Handling During API Cooldown:**

```typescript
// apps/web/components/gamification/GachaSystem.tsx - Enhanced

export function GachaSystem({ userId }: GachaSystemProps) {
  const { pools, collection, isLoading, error, pull } = useGacha(userId);
  const [apiStatus, setApiStatus] = useState<'healthy' | 'degraded' | 'unavailable'>('healthy');

  // Check provider health on mount
  useEffect(() => {
    api.get('/gacha/admin/health')
      .then(res => {
        const health = res.data;
        const allHealthy = Object.values(health).every((h: any) => h.healthy);
        const someHealthy = Object.values(health).some((h: any) => h.healthy);

        if (allHealthy) setApiStatus('healthy');
        else if (someHealthy) setApiStatus('degraded');
        else setApiStatus('unavailable');
      })
      .catch(() => setApiStatus('unavailable'));
  }, []);

  if (isLoading) {
    return <GachaSkeleton />;
  }

  if (error) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-red-400" />
          <h3 className="text-lg font-medium text-white mb-2">
            Unable to Load Gacha
          </h3>
          <p className="text-zinc-400 text-sm mb-4">
            {error.message || "We're experiencing technical difficulties."}
          </p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* API Status Banner */}
      {apiStatus === 'degraded' && (
        <Alert className="mb-4 bg-yellow-500/10 border-yellow-500/30">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-400 text-sm">
            Some content sources are temporarily unavailable.
            You can still pull, but pool variety may be limited.
          </AlertDescription>
        </Alert>
      )}

      {/* Empty State with Graceful Message */}
      {pools.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Gift className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-white mb-2">
              No Gacha Pools Available
            </h3>
            <p className="text-zinc-400 max-w-md mx-auto mb-4">
              {apiStatus === 'unavailable'
                ? "Our content providers are currently unreachable. Please try again in a few minutes."
                : "The gacha system is being set up. Check back soon!"}
            </p>
            {apiStatus !== 'unavailable' && (
              <p className="text-xs text-zinc-500">
                Contact an administrator if this message persists.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="pools">
          {/* ... pools content ... */}
        </Tabs>
      )}
    </>
  );
}
```

**Transaction Safety for Currency Operations:**

```typescript
// Enhanced currency deduction with retry logic

async pull(userId: string, poolId: string) {
  return this.prisma.$transaction(async (tx) => {
    // Lock user row to prevent race conditions
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { currency: true, level: true },
    });

    if (!user) throw new BadRequestException('User not found');
    if (user.currency < actualCost) {
      throw new BadRequestException('Insufficient currency');
    }

    // Deduct currency (idempotent - safe to retry)
    await this.currencyService.deductCurrency(
      userId,
      actualCost,
      TransactionType.GACHA_PULL,
      `Pulled from ${pool.name}`,
      tx,
    );

    // Get pulled item
    const pulledItem = await this.pullService.executePull(pool);

    // Record pull
    const pull = await tx.gachaPull.create({
      data: {
        userId,
        poolId,
        itemId: pulledItem.id,
        cost: actualCost,
      },
      include: { item: true },
    });

    // Add to collection
    await tx.userCollection.upsert({
      where: { userId_itemId: { userId, itemId: pulledItem.id } },
      create: { userId, itemId: pulledItem.id },
      update: { pullCount: { increment: 1 } },
    });

    return { pull, isNew: /* check logic */ };
  }, {
    maxWait: 5000, // 5s max wait for lock
    timeout: 10000, // 10s transaction timeout
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}
```

### Section 2.5: Verification & Validation Protocol

**Pre-Deployment Checklist:**

```markdown
## Pre-Deployment Verification

### Database Migrations

- [ ] Run `prisma migrate dev` successfully
- [ ] Verify `PoolRarityConfig` table created
- [ ] Verify `CloudinaryAsset` table created
- [ ] Verify default rarity configs seeded for existing pools
- [ ] Run `prisma seed:gacha` for default pools

### Environment Variables

- [ ] `WALLHAVEN_API_KEY` set and valid
- [ ] `CLOUDINARY_CLOUD_NAME` set (optional)
- [ ] `CLOUDINARY_API_KEY` set (optional)
- [ ] `CLOUDINARY_API_SECRET` set (optional)
- [ ] `CLOUDINARY_GACHA_FOLDER` set to 'gacha' (default)

### API Testing

- [ ] `GET /gacha/pools` returns pools array
- [ ] `POST /gacha/pull` works with STANDARD pool
- [ ] `POST /gacha/pull` works with PREMIUM pool
- [ ] `GET /gacha/collection` returns user collection
- [ ] Admin endpoints protected by role guard
- [ ] Provider health endpoint returns status

### Provider Testing

- [ ] Wallhaven API key injected in headers
- [ ] Local directory created: `public/gacha/`
- [ ] Local assets accessible via static file endpoint
- [ ] Cloudinary upload works (if configured)
- [ ] Cloudinary metadata context persists

### Frontend Testing

- [ ] "No gacha pools available" message appears gracefully
- [ ] Empty state during API cooldown handled
- [ ] Image loading errors show placeholder
- [ ] Pull animation works correctly
- [ ] Collection grid displays items

### Integration Testing

- [ ] Currency deducted correctly on pull
- [ ] Collection updated after pull
- [ ] Duplicate items increment pullCount
- [ ] Transaction rolls back on error
- [ ] SWR cache invalidates after pull
```

**Post-Deployment Monitoring:**

```typescript
// Monitoring metrics to track

interface GachaMetrics {
  // Pull metrics
  pullsPerHour: number;
  averagePullCost: number;
  currencySpentPerHour: number;

  // Provider health
  wallhavenSuccessRate: number; // Successful fetches / Total attempts
  cloudinarySuccessRate: number;
  localSuccessRate: number;

  // Error tracking
  emptyPoolErrors: number; // "No items available" errors
  apiTimeoutErrors: number; // External API timeouts
  databaseErrors: number; // Transaction failures

  // User experience
  averagePullLatency: number; // ms from request to response
  cacheHitRate: number; // Wallhaven cache efficiency
}

// Alert thresholds
const ALERTS = {
  wallhavenErrorRate: 0.1, // Alert if >10% error rate
  averageLatency: 2000, // Alert if >2s average
  emptyPoolErrors: 5, // Alert if >5 errors/hour
};
```

**Regression Testing Scenarios:**

```typescript
// Test Suite: Gacha Pull Scenarios

describe("Gacha Pull System", () => {
  it("should successfully pull from STANDARD pool with Wallhaven", async () => {
    // Mock Wallhaven API response
    // Execute pull
    // Verify currency deducted
    // Verify item added to collection
  });

  it("should fall back to cache when Wallhaven is down", async () => {
    // Populate cache
    // Mock Wallhaven failure
    // Execute pull
    // Verify still returns items from cache
  });

  it("should reject pull when currency is insufficient", async () => {
    // Set user currency to 0
    // Attempt pull
    // Verify error response
    // Verify no transaction occurred
  });

  it("should prevent concurrent pull exploits", async () => {
    // Set user currency to exact cost
    // Execute 2 pulls simultaneously
    // Verify only one succeeds
    // Verify correct final balance
  });

  it("should handle all providers failing gracefully", async () => {
    // Disable all providers
    // Attempt pull
    // Verify user-friendly error message
    // Verify no currency deducted
  });

  it("should respect admin-configured rarity weights", async () => {
    // Set LEGENDARY weight to 100 (100%)
    // Execute 10 pulls
    // Verify all results are LEGENDARY
  });
});
```

---

## Section 3: Implementation Timeline

### Week 1: Core Fixes & Foundation

- **Day 1-2:** Fix Wallhaven API key injection, seed default pools
- **Day 3-4:** Implement LocalAssetProvider
- **Day 5:** Implement CloudinaryAssetProvider

### Week 2: Admin System & Integration

- **Day 6-7:** Database migrations + Admin controller/service
- **Day 8-9:** Implement GachaPullService with rarity weighting
- **Day 10:** Integrate providers into GachaService

### Week 3: Frontend & Testing

- **Day 11-12:** Admin UI components
- **Day 13-14:** Enhanced GachaSystem with empty states
- **Day 15:** End-to-end testing, bug fixes

---

## Section 4: Technical Specifications Summary

### Cloudinary Integration Logic

```
Cloudinary Upload Flow:
1. Admin selects file or enters Cloudinary public_id
2. If file: Upload to Cloudinary with context metadata
   - Folder: {CLOUDINARY_GACHA_FOLDER}/{poolId}/
   - Context: { name, rarity, weight, poolId }
   - Tags: ["pool-{poolId}", "{rarity}"]
3. Store returned public_id and secure_url in database
4. On pull: Fetch items from Cloudinary API
   - Query by folder prefix
   - Parse context for rarity/weight
   - Apply to weighted selection algorithm

Cloudinary Transformation:
- URL format: https://res.cloudinary.com/{cloud}/image/upload/{transform}/{public_id}
- Transforms: w_{width},h_{height},q_{quality},f_{format}
- Signed URLs for private assets (if needed)
```

### Rarity Weighting Algorithm

```
Algorithm: Cumulative Weighted Selection
Time Complexity: O(n) to calculate weights + O(log n) to select
Space Complexity: O(n)

Pseudocode:
1. Fetch items from all providers
2. Group items by rarity tier
3. For each rarity tier:
   a. Get weight from PoolRarityConfig (default: 1)
   b. Calculate tier probability: weight / totalWeight
4. Select rarity tier:
   a. Generate random number: 0 <= r < totalWeight
   b. Subtract tier weights until r <= 0
   c. Selected tier = current tier
5. Select random item from chosen tier's group
6. Return selected item

Properties:
- Probability of tier = sum(item weights in tier) × tier weight
- Ensures fair distribution per admin configuration
- Handles empty tiers gracefully (fallback to COMMON)
```

---

## Approval Required

Before proceeding with implementation, please confirm approval for:

1. **Database Schema Changes:** Addition of `PoolRarityConfig`, `CloudinaryAsset`, and pool source configuration columns
2. **External Dependencies:** Addition of `cloudinary` npm package
3. **File Storage:** Creation of `public/gacha/` directory for local assets
4. **Admin Access Pattern:** Role-based access control for admin endpoints
5. **Environment Variables:** Addition of Cloudinary configuration variables
6. **API Changes:** New admin endpoints under `/gacha/admin/*`
7. **Rarity Algorithm:** Adoption of cumulative weighted selection over uniform random

---

**Plan Author:** Principal Software Engineer  
**Review Date:** 2026-02-15  
**Next Steps:** Await stakeholder approval before proceeding to implementation
