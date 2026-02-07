// apps/web/hooks/use-tasks.socket.ts
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useSWRConfig } from "swr";

// Options interface for socket configuration
export interface UseTaskSocketOptions {
  invalidateKeys?: (string | ((key: string) => boolean))[];
  events?: string[];
}

// Global socket instance to prevent duplicate connections
let globalSocket: Socket | null = null;
let globalUserId: string | null = null;

export const useTaskSocket = (
  userId: string,
  options: UseTaskSocketOptions = {},
) => {
  const { mutate } = useSWRConfig();
  const socketRef = useRef<Socket | null>(null);
  const mutateRef = useRef(mutate);
  const hasInitialized = useRef(false);

  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);

  useEffect(() => {
    if (!userId) return;

    // Check if we already have a connected socket for this user
    if (globalSocket?.connected && globalUserId === userId) {
      console.log("Socket already connected for user, reusing connection");
      socketRef.current = globalSocket;
      hasInitialized.current = true;
      return;
    }

    // Create new socket connection
    console.log("Creating new socket connection for user:", userId);
    const socket: Socket = io("http://localhost:3001/tasks", {
      withCredentials: true,
      transports: ["websocket"],
    });

    // Store globally and locally
    globalSocket = socket;
    globalUserId = userId;
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to Tasks Namespace");
      socket.emit("join_room", userId);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Tasks Namespace");
    });

    const handleUpdate = (event: string, data: any) => {
      console.log(`Real-time ${event} received:`, data.taskId || data.id || "");

      // Invalidate specified keys or default to /tasks
      const keysToInvalidate = options.invalidateKeys || ["/tasks"];

      keysToInvalidate.forEach((key) => {
        if (typeof key === "string") {
          // For exact string keys
          mutateRef.current(key);
          console.log(`Invalidated SWR key: ${key}`);
        } else if (typeof key === "function") {
          // For predicate functions
          mutateRef.current(key);
        }
      });

      // Also invalidate inventory for attachment events
      if (event === "attachment_added" || event === "attachment_deleted") {
        mutateRef.current(
          (key: string) =>
            typeof key === "string" && key.startsWith("/tasks/inventory"),
        );
        console.log("Invalidated inventory cache");
      }
    };

    const eventsToListen = options.events || [
      "task_created",
      "task_updated",
      "task_deleted",
      "attachment_added",
      "attachment_deleted",
      "subtask_deleted",
      "subtask_added",
      "subtask_updated",
    ];

    eventsToListen.forEach((event) => {
      socket.on(event, (data) => handleUpdate(event, data));
    });

    hasInitialized.current = true;

    // CLEANUP FUNCTION
    return () => {
      // Only cleanup if this component is the one that created the socket
      // and the socket hasn't been taken over by another component
      if (socketRef.current === globalSocket && hasInitialized.current) {
        console.log("Cleaning up socket connection");
        eventsToListen.forEach((event) => socket.off(event));
        socket.disconnect();
        globalSocket = null;
        globalUserId = null;
        socketRef.current = null;
      }
    };
  }, [userId, options.invalidateKeys?.join(","), options.events?.join(",")]);
};
