import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { Logger } from '@nestjs/common';
import { TaskEventPayload } from '../domain';
@WebSocketGateway({
  namespace: 'tasks',
  cors: { origin: 'http://localhost:3000' },
  credentials: true,
})
@UseGuards(AuthGuard)
export class TasksGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TasksGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_room')
    handleJoinRoom(client: Socket, userId: string) {
      const room = `user_${userId}`;
      client.join(room);
      this.logger.log(`User ${userId} joined room ${room}`);
      // Optional: Send confirmation back to client
      client.emit('joined', { room });
    }
  emitToUser(userId: string, event: string, payload: any) {
    // Ensure we emit to the namespace-specific server
    this.server.to(`user_${userId}`).emit(event, payload);
    this.logger.log(`Emitting ${event} to user_${userId}`);
  }
  

  }