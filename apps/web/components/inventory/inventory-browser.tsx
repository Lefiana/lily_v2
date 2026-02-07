"use client";

import { useState, useEffect } from "react";
import { ITaskWithSubtasks } from "@/types/task";
import { Search, Folder } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GridView } from "./grid-view";
import { ListView } from "./list-view";
import { ViewToggle, ViewMode } from "./view-toggle";

interface InventoryBrowserProps {
  tasks: ITaskWithSubtasks[];
}

export function InventoryBrowser({ tasks }: InventoryBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Load view preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(
        "inventory-view-mode",
      ) as ViewMode | null;
      if (saved && (saved === "grid" || saved === "list")) {
        setViewMode(saved);
      }
    }
  }, []);

  // Save view preference when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("inventory-view-mode", viewMode);
    }
  }, [viewMode]);

  // Filter tasks by search query (titles + filenames)
  const filteredTasks = tasks.filter((task) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = task.title.toLowerCase().includes(query);
    const fileMatch = task.TaskAttachment?.some((att) =>
      att.filename.toLowerCase().includes(query),
    );
    return titleMatch || fileMatch;
  });

  return (
    <div className="space-y-6">
      {/* Search and View Toggle Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search tasks and files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-black/40 border-purple-500/30 text-zinc-300 placeholder:text-zinc-600 focus:border-purple-500/50 focus:ring-purple-500/20"
          />
        </div>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="h-64 flex flex-col items-center justify-center text-zinc-500">
          <Folder className="h-12 w-12 mb-4 opacity-50 text-purple-500/50" />
          <p>No files found in inventory.</p>
          <p className="text-sm">Upload files to tasks to see them here.</p>
        </div>
      )}

      {/* View Content */}
      {filteredTasks.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <GridView tasks={filteredTasks} />
          ) : (
            <ListView tasks={filteredTasks} />
          )}
        </>
      )}
    </div>
  );
}
