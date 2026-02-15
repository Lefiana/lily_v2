// apps/web/components/gamification/GachaSystem.tsx
"use client";

import { useState } from "react";
import { useGacha } from "@/hooks/useGacha";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Gift, 
  LayoutGrid,
  Sparkles,
  Star,
  Gem,
  Loader2,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface GachaSystemProps {
  userId: string;
}

const rarityColors: Record<string, { bg: string; text: string; border: string }> = {
  COMMON: { bg: "bg-zinc-500/20", text: "text-zinc-400", border: "border-zinc-500/30" },
  UNCOMMON: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
  RARE: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  EPIC: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  LEGENDARY: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
};

const rarityStars: Record<string, number> = {
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  EPIC: 4,
  LEGENDARY: 5,
};

const defaultRarityColor = { bg: "bg-zinc-500/20", text: "text-zinc-400", border: "border-zinc-500/30" };

export function GachaSystem({ userId }: GachaSystemProps) {
  const { pools, collection, isLoading, pull } = useGacha(userId);
  const [pulling, setPulling] = useState<string | null>(null);
  const [lastPull, setLastPull] = useState<any>(null);
  const [showAnimation, setShowAnimation] = useState(false);

  const handlePull = async (poolId: string) => {
    setPulling(poolId);
    setShowAnimation(true);
    try {
      const result = await pull(poolId);
      setLastPull(result);
      setTimeout(() => setShowAnimation(false), 2000);
    } catch (err) {
      setShowAnimation(false);
    } finally {
      setPulling(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-white/10 rounded w-1/3" />
            <div className="h-40 bg-white/10 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-pink-400" />
          Gacha System
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pools" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger value="pools" className="data-[state=active]:bg-white/10">
              <Gift className="h-4 w-4 mr-2" />
              Gacha Pools
            </TabsTrigger>
            <TabsTrigger value="collection" className="data-[state=active]:bg-white/10">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Collection ({collection.length})
            </TabsTrigger>
          </TabsList>

          {/* Pools Tab */}
          <TabsContent value="pools" className="space-y-4 mt-4">
            {pools.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No gacha pools available.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {pools.map((pool) => (
                  <div
                    key={pool.id}
                    className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-white">{pool.name}</h4>
                        {pool.description && (
                          <p className="text-sm text-zinc-400 mt-1">{pool.description}</p>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          pool.type === "PREMIUM" 
                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" 
                            : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        )}
                      >
                        {pool.type}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Gem className="h-4 w-4 text-yellow-400" />
                        <span>{pool.cost} crystals</span>
                        <span className="text-zinc-600">•</span>
                        <span>{pool._count.items} items</span>
                      </div>
                      
                      <Button
                        onClick={() => handlePull(pool.id)}
                        disabled={pulling === pool.id || showAnimation}
                        className="relative overflow-hidden"
                      >
                        {pulling === pool.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Pulling...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Pull
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pull Animation / Result */}
            {showAnimation && lastPull && (
              <div className="mt-6 p-6 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="animate-bounce mb-4">
                  <Sparkles className="h-12 w-12 mx-auto text-yellow-400" />
                </div>
                <p className="text-lg font-medium text-white mb-2">
                  You obtained:
                </p>
                <div className="inline-block">
                  <div className={cn(
                    "p-4 rounded-lg border-2",
                    (rarityColors[lastPull.pull.item.rarity] || defaultRarityColor).bg,
                    (rarityColors[lastPull.pull.item.rarity] || defaultRarityColor).border
                  )}>
                    <div className="relative w-32 h-32 mx-auto mb-3 rounded-lg overflow-hidden bg-black/40">
                      <Image
                        src={lastPull.pull.item.imageUrl}
                        alt={lastPull.pull.item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <h5 className={cn("font-bold", (rarityColors[lastPull.pull.item.rarity] || defaultRarityColor).text)}>
                      {lastPull.pull.item.name}
                    </h5>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      {Array.from({ length: rarityStars[lastPull.pull.item.rarity] || 1 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    {lastPull.isNew && (
                      <Badge className="mt-2 bg-green-500 text-white">
                        <Check className="h-3 w-3 mr-1" />
                        New!
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Collection Tab */}
          <TabsContent value="collection" className="mt-4">
            {collection.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <LayoutGrid className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Your collection is empty.</p>
                <p className="text-sm mt-1">Start pulling to collect items!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {collection.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all hover:scale-105",
                      (rarityColors[item.item.rarity] || defaultRarityColor).bg,
                      (rarityColors[item.item.rarity] || defaultRarityColor).border
                    )}
                  >
                    <div className="relative w-full aspect-square mb-2 rounded-lg overflow-hidden bg-black/40">
                      <Image
                        src={item.item.imageUrl}
                        alt={item.item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <h5 className="text-sm font-medium text-white truncate">
                      {item.item.name}
                    </h5>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: rarityStars[item.item.rarity] || 1 }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      {item.pullCount > 1 && (
                        <Badge variant="outline" className="text-xs bg-white/10">
                          x{item.pullCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
