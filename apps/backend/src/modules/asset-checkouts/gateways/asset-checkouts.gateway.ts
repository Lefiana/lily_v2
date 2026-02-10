// apps/backend/src/modules/asset-checkouts/gateways/asset-checkouts.gateway.ts

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
import { CheckoutEventPayload } from '../domain';

@WebSocketGateway({
  namespace: 'checkouts',
  cors: { origin: 'http://localhost:3000' },
  credentials: true,
})
@UseGuards(AuthGuard)
export class AssetCheckoutsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AssetCheckoutsGateway.name);

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
    client.emit('joined', { room });
  }

  emitToUser(userId: string, event: string, payload: CheckoutEventPayload) {
    this.server.to(`user_${userId}`).emit(event, payload);
    this.logger.log(`Emitting ${event} to user_${userId}`);
  }
}
