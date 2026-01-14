// apps/web/hooks/use-tasks.socket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSWRConfig } from 'swr';

export const useTaskSocket = (userId: string) => {
  const { mutate } = useSWRConfig();
  const socketRef = useRef<Socket | null>(null);
  const mutateRef = useRef(mutate);
  
  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);

  useEffect(() => {
    if (!userId) return;

    // ADDED "/tasks" to the URL to match the backend namespace
    const socket: Socket = io('http://localhost:3001/tasks', {
      withCredentials: true,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log("Connected to Tasks Namespace");
      // Match the backend SubscribeMessage name
      socket.emit('join_room', userId); 
    });

    const handleUpdate = (event: string, data: any) => {
    console.log(`Bingo! Real-time ${event} received:`, data.taskId || '');
    mutateRef.current('/tasks');
  };

    const refreshEvents = [
      'task_created', 'task_updated', 'task_deleted',
      'attachment_added', 'attachment_deleted',
      'subtask_deleted', 'subtask_added', 'subtask_updated',
    ];

    refreshEvents.forEach(event => {
        socket.on(event, (data) => handleUpdate(event, data));
      });

// CLEANUP FUNCTION
    return () => {
        refreshEvents.forEach(event => socket.off(event));
        socket.disconnect();
        socketRef.current = null;
      };
  }, [userId]);
};