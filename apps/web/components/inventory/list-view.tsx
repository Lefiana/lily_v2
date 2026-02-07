"use client";

import { useState } from "react";
import { ITaskWithSubtasks } from "@/types/task";
import {
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ListViewProps {
  tasks: ITaskWithSubtasks[];
}

export function ListView({ tasks }: ListViewProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // Group tasks by first letter
  const groupedTasks = tasks.reduce(
    (acc, task) => {
      const firstLetter = task.title[0]?.toUpperCase() || "#";
      if (!acc[firstLetter]) acc[firstLetter] = [];
      acc[firstLetter].push(task);
      return acc;
    },
    {} as Record<string, ITaskWithSubtasks[]>,
  );

  if (tasks.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-zinc-500">
        <Folder className="h-12 w-12 mb-4 opacity-50 text-purple-500/50" />
        <p>No files found in inventory.</p>
        <p className="text-sm">Upload files to tasks to see them here.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 rounded-2xl border border-purple-500/20 overflow-hidden">
      {Object.entries(groupedTasks)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([letter, letterTasks]) => (
          <div
            key={letter}
            className="border-b border-purple-500/10 last:border-b-0"
          >
            {/* Section Header */}
            <div className="px-4 py-2 bg-purple-500/5 text-xs font-bold text-purple-400/60 uppercase tracking-wider">
              {letter}
            </div>

            {/* Task Folders */}
            <div className="divide-y divide-purple-500/5">
              {letterTasks.map((task) => (
                <div key={task.id}>
                  {/* Task Folder Header */}
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 transition-colors",
                      "hover:bg-purple-500/5",
                    )}
                  >
                    {expandedTasks.has(task.id) ? (
                      <ChevronDown className="h-4 w-4 text-purple-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-600" />
                    )}
                    <Folder className="h-5 w-5 text-purple-400" />
                    <span className="flex-1 text-left text-sm text-zinc-300 truncate">
                      {task.title}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {task.TaskAttachment?.length || 0} file
                      {(task.TaskAttachment?.length || 0) !== 1 ? "s" : ""}
                    </span>
                  </button>

                  {/* Expanded Files */}
                  {expandedTasks.has(task.id) && (
                    <div className="bg-black/30">
                      {task.TaskAttachment?.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-3 px-12 py-2 hover:bg-purple-500/5 transition-colors"
                        >
                          <FileText className="h-4 w-4 text-zinc-600" />
                          <span className="flex-1 text-sm text-zinc-400 truncate">
                            {attachment.filename}
                          </span>
                          <span className="text-xs text-zinc-600">
                            {(attachment.size / 1024).toFixed(1)} KB
                          </span>
                          <a
                            href={`http://localhost:3001/api/tasks/attachments/${attachment.id}/download`}
                            download
                            className="p-2 hover:bg-purple-500/20 rounded transition-colors"
                            title="Download"
                          >
                            <Download className="h-3 w-3 text-purple-400" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
