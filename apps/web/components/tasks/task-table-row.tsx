// apps/web/components/tasks/task-table-row.tsx
"use client"

import { useState } from "react"
import { 
  ChevronRight, 
  Paperclip, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Pencil, 
  Calendar, 
  X,
  Download,
  FileIcon,
  FileText,
  Search,
} from "lucide-react"
import { useSWRConfig } from 'swr';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ITaskWithSubtasks, TaskStatus } from "../../types/task" 
import { useSubtasks } from "@/hooks/useSubtasks"
import { TaskTableRowProps } from "../../types/task"

export function TaskTableRow({ task, onDelete, onEdit }: TaskTableRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Hook for subtask operations
  const { createSubtask, toggleSubtask, deleteSubtask } = useSubtasks(task.id)

  // Progress Calculation
  const subtasks = task.subtask || [];
  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const { mutate } = useSWRConfig();
  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    try {
      await createSubtask({ title: newSubtaskTitle });
      setNewSubtaskTitle("");
      setIsAddingSubtask(false);
    } catch (error) {
      console.error("Failed to add subtask", error);
    }
  }

  const dueDate = task.dueDate ? new Date(task.dueDate as string).toLocaleDateString() : null;

  // file handling
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !task.id) return;

  const taskId = task.id;
  console.log("Preparing upload for Task ID:", taskId);

    const formData = new FormData();
    if (files.length === 1) {
      const file = files[0];
      if (file) formData.append('file', file); // TypeScript is now happy because file is definitely a Blob/File
    } else {
      Array.from(files).forEach(file => {
        if (file) formData.append('files', file);
      });
    }


    try {
      const endpoint = files.length === 1 
        ? `http://localhost:3001/api/tasks/${task.id}/attachments`
        : `http://localhost:3001/api/tasks/${task.id}/attachments/bulk`;

        console.log("Uploading to:", endpoint); // Debugging line
  
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        console.log("Intel secured.");
        // Clear input so same file can be uploaded again if deleted
        e.target.value = '';
      }else{
        const errorText = await response.text();
        console.error("Upload failed with status", response.status, errorText);
      }
    } catch (error) {
      console.error("Upload failed", error);
    }
  };

  const handleDeleteFile = async (attachmentId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tasks/attachments/${attachmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
if (response.ok) {
      console.log("Intel purged.");
      mutate('/tasks'); // Force refresh the list
    }
    } catch (error) {
      console.error("Delete failed", error);
    }
  };
return (
  <div 
    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
    onDragLeave={() => setIsDragging(false)}
    onDrop={async (e) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        // This calls your file upload logic
        handleFileChange({ target: { files } } as any); 
      }
    }}
    className={`relative rounded-xl transition-all ${isDragging ? 'ring-2 ring-blue-500 bg-blue-500/5' : ''}`}
  >
    {/* Visual Overlay when dragging */}
    {isDragging && (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/10 backdrop-blur-sm pointer-events-none rounded-xl">
        <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-bounce">
          DROP TO ATTACH INTEL
        </div>
      </div>
    )}

      <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full border-b border-white/5 transition-all hover:bg-white/[0.02]"
    >
      {/* --- MAIN ROW --- */}
      <div className="flex items-center gap-4 px-4 py-4">
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-0 h-8 w-8 text-zinc-500 hover:bg-white/10"
            title={isOpen ? "Collapse Details" : "Expand Details"}
            aria-label={isOpen ? "Collapse quest details" : "Expand quest details"}
          >
            <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
          </Button>
        </CollapsibleTrigger>

        {/* Quest Info & Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className={`font-medium truncate text-zinc-100 ${task.status === TaskStatus.COMPLETED ? 'line-through text-zinc-500' : ''}`}>
              {task.title}
            </span>
            <Badge variant="outline" className="text-[10px] border-white/20 text-zinc-400 uppercase font-bold px-1.5 h-5">
              {task.status}
            </Badge>
            {dueDate && (
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Calendar className="h-3 w-3" />
                {dueDate}
              </span>
            )}
          </div>

          {/* Mini Progress Bar */}
          {totalCount > 0 && (
            <div className="mt-2 w-full max-w-[200px] h-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" 
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation(); 
              onEdit(task);        
            }}
            title="Edit Quest"
            aria-label="Edit quest"
          >
            <Pencil className="h-4 w-4 text-zinc-500" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation(); 
              onDelete(task.id)
            }}
            title="Delete Quest"
            aria-label="Delete quest"
          >
            <Trash2 className="h-4 w-4 text-red-500/60 hover:text-red-500" />
          </Button>
        </div>
      </div>

      {/* --- EXPANDED CONTENT --- */}
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="px-16 pb-8 pt-2 grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* Subtasks Section */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Objectives ({completedCount}/{totalCount})
            </h4>

            <div className="space-y-3">
              {(task.subtask || []).map((sub) => (
                <div key={sub.id} className="flex items-center justify-between group/sub">
                  <div 
                    className="flex items-center gap-3 text-sm text-zinc-300 cursor-pointer hover:text-white transition-colors"
                    onClick={() => toggleSubtask(sub)}
                  >
                    {sub.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-zinc-700 group-hover/sub:text-zinc-500" />
                    )}
                    <span className={sub.completed ? 'line-through text-zinc-500' : ''}>
                      {sub.title}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteSubtask(sub.id); }}
                    className="opacity-0 group-hover/sub:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all"
                    title="Remove Objective"
                    aria-label="Remove objective"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {isAddingSubtask ? (
                <div className="flex items-center gap-2 pt-2">
                  <label htmlFor={`new-obj-${task.id}`} className="sr-only">New Objective</label>
                  <input
                    id={`new-obj-${task.id}`}
                    autoFocus
                    className="flex-1 text-sm border-b border-blue-500/50 outline-none bg-transparent py-1 text-white placeholder:text-zinc-700"
                    placeholder="Enter objective..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                  />
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-400" onClick={handleAddSubtask} title="Save Objective">Accept</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-600" onClick={() => setIsAddingSubtask(false)} title="Cancel">Cancel</Button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingSubtask(true)}
                  className="text-xs text-blue-500 hover:text-blue-400 font-bold tracking-wide transition-colors pt-2"
                >
                  + ADD OBJECTIVE
                </button>
              )}
            </div>
          </div>

          {/* Description & Intel Section */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Lore / Description</h4>
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                <p className="text-sm text-zinc-400 italic leading-relaxed">
                  {task.description || "No further details available for this quest."}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Quest Intel</h4>
              
              {/* List of Files */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Quest Intel</h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(task.TaskAttachment || []).map((file) => {
                      const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(file.filename);
                      const fileUrl = `http://localhost:3001/api/tasks/attachments/${file.id}/download`;

                      return (
                        <div key={file.id} className="group relative aspect-square bg-white/5 border border-white/10 rounded-lg overflow-hidden transition-all hover:border-white/20">
                          {/* Preview logic */}
                          <div className="w-full h-full flex items-center justify-center">
                            {isImage ? (
                              <img 
                                src={fileUrl} 
                                alt={file.filename} 
                                className="object-cover w-full h-full cursor-pointer transition-transform duration-500 group-hover:scale-110"
                                onClick={() => setZoomedImage(fileUrl)}
                              />
                            ) : (
                              <FileText className="h-8 w-8 text-zinc-700" />
                            )}
                          </div>

                          {/* Action Overlay */}
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {isImage && (
                              <Button 
                                variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-white/10 hover:bg-white/20"
                                onClick={() => setZoomedImage(fileUrl)}
                                title="Zoom Image" aria-label="Zoom image"
                              >
                                <Search className="h-4 w-4 text-white" />
                              </Button>
                            )}
                            <a 
                              href={fileUrl} 
                              download 
                              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                              title="Download File" aria-label={`Download ${file.filename}`}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <Button 
                              variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-red-500/20 hover:bg-red-500/40"
                              onClick={() => handleDeleteFile(file.id)}
                              title="Purge Intel" aria-label="Delete attachment"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                          
                          {/* Filename Tag */}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 backdrop-blur-sm">
                            <p className="text-[9px] text-zinc-300 truncate">{file.filename}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* --- LIGHTBOX MODAL --- */}
                  {zoomedImage && (
                    <div 
                      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
                      onClick={() => setZoomedImage(null)}
                    >
                      <Button 
                        variant="ghost" 
                        className="absolute top-4 right-4 text-white hover:bg-white/10"
                        onClick={() => setZoomedImage(null)}
                        title="Close Preview" aria-label="Close image preview"
                      >
                        <X className="h-6 w-6" />
                      </Button>
                      <img 
                        src={zoomedImage} 
                        alt="Zoomed Intel" 
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300" 
                      />
                    </div>
                  )}
                </div>

              {/* Upload Action */}
              <div className="pt-2">
                <label htmlFor={`file-input-${task.id}`} className="sr-only">Upload quest intel files</label>
                <input 
                  type="file" 
                  id={`file-input-${task.id}`}
                  className="hidden" 
                  multiple 
                  onChange={handleFileChange}
                  title="Select files to upload"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 text-[10px] gap-2 border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white uppercase font-bold tracking-widest w-full border-dashed"
                  onClick={() => document.getElementById(`file-input-${task.id}`)?.click()}
                  title="Attach Intel Files"
                  aria-label="Attach intel files"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Attach Intel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  </div>
);

}