import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import type { Role } from '@kitchenflow/types';
import type { InventoryChangedEvent, OrderCreatedEvent, OrderStatusUpdatedEvent } from '@kitchenflow/types';

interface SocketAuthPayload {
  sub: string;
  restaurantId: string;
  role: Role;
}

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'], credentials: true },
  namespace: 'operations'
})
export class OperationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    const requestedRestaurantId = client.handshake.auth.restaurantId;

    if (typeof token !== 'string') {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwt.verifyAsync<SocketAuthPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET')
      });
      if (typeof requestedRestaurantId === 'string' && requestedRestaurantId !== payload.restaurantId) {
        client.disconnect(true);
        return;
      }
      client.data.restaurantId = payload.restaurantId;
      client.data.role = payload.role;
      void client.join(this.restaurantRoom(payload.restaurantId));
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    client.removeAllListeners();
  }

  @SubscribeMessage('order.status.updated')
  broadcastOrderStatus(@MessageBody() body: OrderStatusUpdatedEvent) {
    this.emitOrderStatusUpdated(body);
    return { ok: true };
  }

  @SubscribeMessage('inventory.changed')
  broadcastInventory(@MessageBody() body: InventoryChangedEvent) {
    this.emitInventoryChanged(body);
    return { ok: true };
  }

  @SubscribeMessage('notifications.join')
  joinNotifications(@ConnectedSocket() client: Socket, @MessageBody() body: { restaurantId: string }) {
    if (client.data.restaurantId !== body.restaurantId) {
      return { ok: false };
    }
    void client.join(this.restaurantRoom(body.restaurantId));
    return { ok: true };
  }

  emitOrderCreated(body: OrderCreatedEvent) {
    this.server.to(this.restaurantRoom(body.restaurantId)).emit('order.created', body);
  }

  emitOrderStatusUpdated(body: OrderStatusUpdatedEvent) {
    this.server.to(this.restaurantRoom(body.restaurantId)).emit('order.status.updated', body);
  }

  emitInventoryChanged(body: InventoryChangedEvent) {
    this.server.to(this.restaurantRoom(body.restaurantId)).emit('inventory.changed', body);
  }

  private restaurantRoom(restaurantId: string) {
    return `restaurant:${restaurantId}`;
  }
}
