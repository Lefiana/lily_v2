'use client';

import { useState, useEffect, useRef } from "react"
import { useInventory } from "@/hooks/useTasks";
import { authClient } from "@/lib/auth-client";
import { TaskCategory } from "@/types/task";
import { InventoryBrowser } from "@/components/inventory/inventory-browser";
import { CategoryFilter } from "@/components/tasks/category-filter";
import { useSearchParams, useRouter } from "next/navigation";

export default function InventoryPage() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasMounted = useRef(false);
  
  // Initialize from URL/localStorage only once
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | undefined>(() => {
    const urlCategory = searchParams.get('category') as TaskCategory | null;
    if (urlCategory && Object.values(TaskCategory).includes(urlCategory)) {
      return urlCategory;
    }
    // Try localStorage only on client
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inventory-category');
      if (saved && Object.values(TaskCategory).includes(saved as TaskCategory)) {
        return saved as TaskCategory;
      }
    }
    return undefined;
  });
  
  const { tasks, isLoading } = useInventory(userId, selectedCategory);

  // Update URL and localStorage when category changes (but not on initial mount)
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const params = new URLSearchParams();
    if (selectedCategory) {
      params.set('category', selectedCategory);
      localStorage.setItem('inventory-category', selectedCategory);
    } else {
      localStorage.removeItem('inventory-category');
    }
    
    // Use replace without scroll to prevent layout shifts
    router.replace(`/inventory?${params.toString()}`, { scroll: false });
  }, [selectedCategory, router]);

  if (isLoading) return <div className="text-zinc-400 p-8">Loading Inventory...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white uppercase">Inventory</h2>
          <p className="text-zinc-400">Browse files organized by task.</p>
        </div>
        
        <CategoryFilter 
          value={selectedCategory}
          onChange={setSelectedCategory}
        />
      </div>

      <InventoryBrowser tasks={tasks} />
    </div>
  );
}
