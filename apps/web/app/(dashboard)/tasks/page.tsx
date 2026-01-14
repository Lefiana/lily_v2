'use client';

import { useState } from "react"
import { CreateTaskModal } from "@/components/tasks/create-task-modal";
import { TaskTableRow } from "@/components/tasks/task-table-row"; 
import { EditTaskModal } from "@/components/tasks/edit-task-modal";
import { useTasks } from "@/hooks/useTasks";
import { authClient } from "@/lib/auth-client";
import { ITaskWithSubtasks } from "@/types/task";
import { useTaskSocket } from "@/hooks/use-tasks.socket";

export default function TasksPage() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || "";
  const { tasks, isLoading, deleteTask, updateTask } = useTasks(userId);

// State for the Edit Modal
  const [selectedTask, setSelectedTask] = useState<ITaskWithSubtasks | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  useTaskSocket(userId);
  const handleEditClick = (task: ITaskWithSubtasks) => {
    setSelectedTask(task)
    setIsEditOpen(true)
  }

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

      {/* TABLE SECTION */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        {/* Optional Header Row for that "Table" feel */}
        <div className="hidden md:flex items-center gap-4 px-6 py-3 bg-white/5 border-b border-white/10 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          <div className="w-8" /> {/* Space for chevron */}
          <div className="flex-1">Active Quests</div>
          <div className="w-24 text-right">Actions</div>
        </div>

        <div className="flex flex-col">
          {tasks.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-zinc-500 italic">
              No active quests. Click "New Quest" to begin.
            </div>
          ) : (
            tasks.map((task: ITaskWithSubtasks) => (
              <TaskTableRow 
                key={task.id} 
                task={task} 
                onDelete={(id) => deleteTask(id)} // Pass your hook's delete function
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