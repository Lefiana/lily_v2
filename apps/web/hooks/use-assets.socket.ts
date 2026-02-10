// apps/web/hooks/use-assets.socket.ts
"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useSWRConfig } from "swr";

export interface UseAssetSocketOptions {
  invalidateKeys?: (string | ((key: string) => boolean))[];
  events?: string[];
}

// Global socket instance to prevent duplicate connections
let globalSocket: Socket | null = null;
let globalUserId: string | null = null;

export const useAssetSocket = (
  userId: string,
  options: UseAssetSocketOptions = {},
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
      console.log(
        "Asset socket already connected for user, reusing connection",
      );
      socketRef.current = globalSocket;
      hasInitialized.current = true;
      return;
    }

    // Create new socket connection
    console.log("Creating new asset socket connection for user:", userId);
    const socket: Socket = io("http://localhost:3001/assets", {
      withCredentials: true,
      transports: ["websocket"],
    });

    // Store globally and locally
    globalSocket = socket;
    globalUserId = userId;
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to Assets Namespace");
      socket.emit("join_room", userId);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Assets Namespace");
    });

    const handleUpdate = (event: string, data: any) => {
      console.log(
        `Real-time ${event} received:`,
        data.assetId || data.id || "",
      );

      // Invalidate specified keys or default to /assets
      const keysToInvalidate = options.invalidateKeys || ["/assets"];

      keysToInvalidate.forEach((key) => {
        if (typeof key === "string") {
          mutateRef.current(key);
          console.log(`Invalidated SWR key: ${key}`);
        } else if (typeof key === "function") {
          mutateRef.current(key);
        }
      });

      // Also invalidate available assets for availability changes
      if (event === "asset_availability_changed") {
        mutateRef.current(
          (key: string) =>
            typeof key === "string" && key.startsWith("/assets/available"),
        );
        console.log("Invalidated available assets cache");
      }
    };

    const eventsToListen = options.events || [
      "asset_created",
      "asset_updated",
      "asset_deleted",
      "asset_availability_changed",
      "attachment_added",
      "attachment_deleted",
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
        console.log("Cleaning up asset socket connection");
        eventsToListen.forEach((event) => socket.off(event));
        socket.disconnect();
        globalSocket = null;
        globalUserId = null;
        socketRef.current = null;
      }
    };
  }, [userId, options.invalidateKeys?.join(","), options.events?.join(",")]);
};

// Hook for checkout socket events
export const useCheckoutSocket = (
  userId: string,
  options: UseAssetSocketOptions = {},
) => {
  const { mutate } = useSWRConfig();
  const socketRef = useRef<Socket | null>(null);
  const mutateRef = useRef(mutate);

  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);

  useEffect(() => {
    if (!userId) return;

    const socket: Socket = io("http://localhost:3001/checkouts", {
      withCredentials: true,
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to Checkouts Namespace");
      socket.emit("join_room", userId);
    });

    const handleUpdate = (event: string) => {
      const keysToInvalidate = options.invalidateKeys || ["/asset-checkouts"];

      keysToInvalidate.forEach((key) => {
        if (typeof key === "string") {
          mutateRef.current(key);
        } else if (typeof key === "function") {
          mutateRef.current(key);
        }
      });
    };

    const eventsToListen = options.events || [
      "checkout_created",
      "checkout_updated",
      "checkout_returned",
      "checkout_cancelled",
    ];

    eventsToListen.forEach((event) => {
      socket.on(event, () => handleUpdate(event));
    });

    return () => {
      eventsToListen.forEach((event) => socket.off(event));
      socket.disconnect();
    };
  }, [userId, options.invalidateKeys?.join(","), options.events?.join(",")]);
};
