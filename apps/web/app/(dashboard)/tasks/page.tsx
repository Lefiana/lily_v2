'use client';

import { useState, useEffect, useRef } from "react"
import { CreateTaskModal } from "@/components/tasks/create-task-modal";
import { TaskTableRow } from "@/components/tasks/task-table-row"; 
import { EditTaskModal } from "@/components/tasks/edit-task-modal";
import { useTasks } from "@/hooks/useTasks";
import { authClient } from "@/lib/auth-client";
import { ITaskWithSubtasks, TaskCategory } from "@/types/task";
import { CategoryFilter } from "@/components/tasks/category-filter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function TasksPage() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasMounted = useRef(false);
  
  // Local state for immediate UI response
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || "");
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | undefined>(() => {
    const urlCategory = searchParams.get('category') as TaskCategory | null;
    return urlCategory && Object.values(TaskCategory).includes(urlCategory) 
      ? urlCategory 
      : undefined;
  });
  
  // Use client-side filtering for instant search
  const { 
    tasks, 
    allTasks,
    isLoading, 
    deleteTask, 
    updateTask 
  } = useTasks(
    userId, 
    selectedCategory,
    searchQuery,  // Pass query for client-side filter
    { enableClientFilter: true }  // Enable instant filtering
  );

  // State for the Edit Modal
  const [selectedTask, setSelectedTask] = useState<ITaskWithSubtasks | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  // Track if search is active
  const isFiltering = searchQuery.length > 0;

  const handleEditClick = (task: ITaskWithSubtasks) => {
    setSelectedTask(task)
    setIsEditOpen(true)
  }

  // Clear search handler
  const handleClearSearch = () => {
    setSearchQuery("");
  };

  // Update URL when filters change (but not on initial mount)
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    
    const queryString = params.toString();
    router.replace(`/tasks${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [searchQuery, selectedCategory, router]);

  if (isLoading) return <div className="text-white p-8">Loading Quests...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white uppercase">Quest Board</h2>
          <p className="text-zinc-400">Complete tasks to earn rewards and progress.</p>
        </div>
        
        <CreateTaskModal userId={session?.user?.id || ""} />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search quests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "pl-10 pr-10 bg-black/40 border-purple-500/30 text-zinc-300 placeholder:text-zinc-600 focus:border-purple-500/50 focus:ring-purple-500/20",
              isFiltering && "border-purple-400 ring-2 ring-purple-400/20"
            )}
          />
          {/* Clear search button */}
          {isFiltering && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <CategoryFilter 
          value={selectedCategory}
          onChange={setSelectedCategory}
        />
      </div>

      {/* Results Count */}
      {isFiltering && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">
            Showing <span className="text-purple-400 font-semibold">{tasks.length}</span> of{" "}
            <span className="text-zinc-300">{allTasks.length}</span> quests
          </span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleClearSearch}
            className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
          >
            Clear Search
          </Button>
        </div>
      )}

      {/* TABLE SECTION */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        {/* Header Row */}
        <div className="hidden md:flex items-center gap-4 px-6 py-3 bg-white/5 border-b border-white/10 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          <div className="w-8" />
          <div className="flex-1">Active Quests</div>
          <div className="w-32">Category</div>
          <div className="w-24 text-right">Actions</div>
        </div>

        <div className="flex flex-col">
          {tasks.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-zinc-500">
              {isFiltering ? (
                <>
                  <p className="italic">No quests match &quot;{searchQuery}&quot;</p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleClearSearch}
                    className="mt-2 text-purple-400 hover:text-purple-300"
                  >
                    Clear Search
                  </Button>
                </>
              ) : (
                <p className="italic">No active quests. Click &quot;New Quest&quot; to begin.</p>
              )}
            </div>
          ) : (
            tasks.map((task: ITaskWithSubtasks) => (
              <TaskTableRow 
                key={task.id} 
                task={task} 
                onDelete={(id) => deleteTask(id)}
                onEdit={() => handleEditClick(task)} 
              />
            ))
          )}
        </div>
        
        {/* Edit Task Modal */}
        <EditTaskModal
          task={selectedTask}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSave={updateTask}
        />
      </div>
    </div>
  );
}
