"use client";

import { useState } from "react";
import { ITaskWithSubtasks, ITaskAttachment } from "@/types/task";
import { FileText, Download, Folder, ImageIcon, X } from "lucide-react";

interface GridViewProps {
  tasks: ITaskWithSubtasks[];
}

// Helper to check if file is an image
function isImageFile(filename: string): boolean {
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".bmp",
  ];
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return imageExtensions.includes(ext);
}

// Individual file card component
function FileCard({
  attachment,
  taskTitle,
}: {
  attachment: ITaskAttachment;
  taskTitle: string;
}) {
  const [imageError, setImageError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const isImage = isImageFile(attachment.filename);
  const fileUrl = `http://localhost:3001/api/tasks/attachments/${attachment.id}/download`;

  return (
    <>
      <div className="group relative bg-zinc-900/80 border border-purple-500/20 rounded-xl overflow-hidden hover:border-purple-500/40 transition-all hover:shadow-[0_0_20px_rgba(147,51,234,0.2)]">
        {/* Thumbnail Area */}
        <div className="aspect-square bg-black/50 flex items-center justify-center relative overflow-hidden">
          {isImage && !imageError ? (
            <img
              src={fileUrl}
              alt={attachment.filename}
              className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
              onClick={() => setIsZoomed(true)}
            />
          ) : (
            <div className="flex flex-col items-center text-zinc-600">
              {isImage ? (
                <ImageIcon className="h-12 w-12 mb-2" />
              ) : (
                <FileText className="h-12 w-12 mb-2" />
              )}
              <span className="text-xs uppercase">
                {isImage ? "Image" : "File"}
              </span>
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {isImage && !imageError && (
              <button
                onClick={() => setIsZoomed(true)}
                className="p-2 bg-purple-600/80 hover:bg-purple-600 rounded-full text-white transition-colors"
                title="View"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
            )}
            <a
              href={fileUrl}
              download
              className="p-2 bg-purple-600/80 hover:bg-purple-600 rounded-full text-white transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Info Area */}
        <div className="p-3 border-t border-purple-500/10">
          <p
            className="text-sm text-zinc-300 truncate font-medium"
            title={attachment.filename}
          >
            {attachment.filename}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-zinc-500">
              {(attachment.size / 1024).toFixed(1)} KB
            </span>
            <span
              className="text-xs text-purple-400/60 truncate max-w-[100px]"
              title={taskTitle}
            >
              {taskTitle}
            </span>
          </div>
        </div>
      </div>

      {/* Zoom Modal */}
      {isZoomed && isImage && !imageError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setIsZoomed(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-purple-400 transition-colors p-2"
            onClick={() => setIsZoomed(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={fileUrl}
            alt={attachment.filename}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export function GridView({ tasks }: GridViewProps) {
  // Flatten all attachments from all tasks
  const allAttachments = tasks.flatMap((task) =>
    (task.TaskAttachment || []).map((attachment) => ({
      ...attachment,
      taskTitle: task.title,
      taskId: task.id,
    })),
  );

  if (allAttachments.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-zinc-500">
        <Folder className="h-12 w-12 mb-4 opacity-50 text-purple-500/50" />
        <p>No files found in inventory.</p>
        <p className="text-sm">Upload files to tasks to see them here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {allAttachments.map((attachment) => (
        <FileCard
          key={attachment.id}
          attachment={attachment}
          taskTitle={attachment.taskTitle}
        />
      ))}
    </div>
  );
}
