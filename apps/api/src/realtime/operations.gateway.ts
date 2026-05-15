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
import { ObservabilityService } from '../common/observability/observability.service';

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
    private readonly config: ConfigService,
    private readonly observability: ObservabilityService
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    const requestedRestaurantId = client.handshake.auth.restaurantId;

    if (typeof token !== 'string') {
      this.observability.recordSocketRejected();
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwt.verifyAsync<SocketAuthPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET')
      });
      if (typeof requestedRestaurantId === 'string' && requestedRestaurantId !== payload.restaurantId) {
        this.observability.recordSocketRejected();
        client.disconnect(true);
        return;
      }
      client.data.restaurantId = payload.restaurantId;
      client.data.role = payload.role;
      void client.join(this.restaurantRoom(payload.restaurantId));
      this.observability.recordSocketConnected();
    } catch {
      this.observability.recordSocketRejected();
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.restaurantId) {
      this.observability.recordSocketDisconnected();
    }
    client.removeAllListeners();
  }

  @SubscribeMessage('order.status.updated')
  broadcastOrderStatus() {
    return { ok: false, message: 'Server-side order mutations publish realtime events.' };
  }

  @SubscribeMessage('inventory.changed')
  broadcastInventory() {
    return { ok: false, message: 'Server-side inventory mutations publish realtime events.' };
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
    this.observability.recordSocketEmission();
    this.server.to(this.restaurantRoom(body.restaurantId)).emit('order.created', body);
  }

  emitOrderStatusUpdated(body: OrderStatusUpdatedEvent) {
    this.observability.recordSocketEmission();
    this.server.to(this.restaurantRoom(body.restaurantId)).emit('order.status.updated', body);
  }

  emitInventoryChanged(body: InventoryChangedEvent) {
    this.observability.recordSocketEmission();
    this.server.to(this.restaurantRoom(body.restaurantId)).emit('inventory.changed', body);
  }

  private restaurantRoom(restaurantId: string) {
    return `restaurant:${restaurantId}`;
  }
}
