
// "use client"

// import { useState } from "react"
// import { ChevronRight, Paperclip, CheckCircle2, Circle, Trash2, Pencil, Calendar } from "lucide-react"
// import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { ITaskWithSubtasks, TaskStatus } from "../../types/task" // Adjust path
// import { useSubtasks } from "@/hooks/useSubtasks"

// interface TaskTableRowProps {
//   task: ITaskWithSubtasks; // Using your actual backend interface
//   onDelete: (id: string) => void;
//   onEdit: (task: ITaskWithSubtasks) => void;
// }

// export function TaskTableRow({ task, onDelete, onEdit }: TaskTableRowProps) {
//   const [isOpen, setIsOpen] = useState(false)
//   const [isAddingSubtask, setIsAddingSubtask] = useState(false)
//   const [newSubtaskTitle, setNewSubtaskTitle] = useState("")

//   const handleAddSubtask = async ( ) => {
//     if (!newSubtaskTitle.trim()) return;
//       try {
//         // We'll call your API here
//         // await tasksApi.addSubtask(task.id, { title: newSubtaskTitle });
        
//         setNewSubtaskTitle("");
//         setIsAddingSubtask(false);
//         // Trigger SWR refresh here later
//       } catch (error) {
//         console.error("Failed to add subtask", error);
//     }
//   }

//   // Helper to format date if it exists
//   const dueDate = task.dueDate ? new Date(task.dueDate as string).toLocaleDateString() : null;

//   return (
//     <Collapsible
//       open={isOpen}
//       onOpenChange={setIsOpen}
//       className="w-full border-b border-slate-200 transition-all hover:bg-white/[0.03]"
//     >
//       <div className="flex items-center gap-4 px-4 py-3">
//         <CollapsibleTrigger asChild>
//           <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
//             <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
//           </Button>
//         </CollapsibleTrigger>

//         {/* Task Info */}
//         <div className="flex-1 min-w-0">
//           <div className="flex items-center gap-3">
//             <span className={`font-medium truncate ${task.status === TaskStatus.COMPLETED ? 'line-through text-slate-400' : ''}`}>
//               {task.title}
//             </span>
            
//             {/* Status Badge */}
//             <Badge variant="outline" className="text-[10px] uppercase font-bold px-1.5 h-5">
//               {task.status}
//             </Badge>

//             {dueDate && (
//               <span className="flex items-center gap-1 text-xs text-slate-400">
//                 <Calendar className="h-3 w-3" />
//                 {dueDate}
//               </span>
//             )}
//           </div>
//         </div>

//         {/* Action Buttons */}
//         <div className="flex items-center gap-1">
//           <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
//             <Pencil className="h-4 w-4 text-slate-500" />
//           </Button>
//           <Button variant="ghost" size="sm" onClick={() => onDelete(task.id)}>
//             <Trash2 className="h-4 w-4 text-red-500" />
//           </Button>
//         </div>
//       </div>

//       <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
//         <div className="px-16 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          
//           {/* Subtasks Section */}
//             <div className="space-y-3">
//               <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
//                 Subtasks ({task.subtask?.length || 0})
//               </h4>
//               <div className="space-y-2">
//                 {task.subtask?.map((sub) => (
//                   <div key={sub.id} className="flex items-center gap-2 text-sm text-slate-600">
//                     {sub.completed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-slate-300" />}
//                     <span>{sub.title}</span>
//                   </div>
//                 ))}

//                 {isAddingSubtask ? (
//                   <div className="flex items-center gap-2 pt-1">
//                     <input
//                       autoFocus
//                       className="flex-1 text-sm border-b border-blue-400 outline-none bg-transparent py-1"
//                       placeholder="Subtask title..."
//                       value={newSubtaskTitle}
//                       onChange={(e) => setNewSubtaskTitle(e.target.value)}
//                       onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
//                     />
//                     <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleAddSubtask}>Add</Button>
//                     <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-400" onClick={() => setIsAddingSubtask(false)}>Cancel</Button>
//                   </div>
//                 ) : (
//                   <Button 
//                     variant="ghost" 
//                     className="p-0 h-auto text-xs text-blue-600 hover:bg-transparent hover:underline"
//                     onClick={() => setIsAddingSubtask(true)}
//                   >
//                     + Add Subtask
//                   </Button>
//                 )}
//               </div>
//             </div>

//           {/* Description / More Info Section */}
//           <div className="space-y-3">
//             <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</h4>
//             <p className="text-sm text-slate-600 italic">
//               {task.description || "No description provided."}
//             </p>
            
//             <div className="pt-4 flex gap-2">
//                <Button variant="outline" size="sm" className="h-8 text-xs gap-2">
//                   <Paperclip className="h-3 w-3" />
//                   Attach File
//                </Button>
//             </div>
//           </div>

//         </div>
//       </CollapsibleContent>
//     </Collapsible>
//   )
// }