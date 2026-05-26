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

const DEFAULT_SOCKET_ORIGINS = ['http://localhost:3000', 'http://localhost:3002', 'https://kitchenflow-commerce.vercel.app'];

function socketCorsOrigins() {
  return [
    ...new Set([
      ...DEFAULT_SOCKET_ORIGINS,
      ...(process.env.CORS_ORIGIN ?? '')
        .split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean)
    ])
  ];
}

interface SocketAuthPayload {
  sub: string;
  restaurantId: string;
  role: Role;
}

@WebSocketGateway({
  cors: { origin: socketCorsOrigins(), credentials: true },
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
    const requestId =
      typeof client.handshake.auth.requestId === 'string'
        ? client.handshake.auth.requestId
        : Array.isArray(client.handshake.headers['x-request-id'])
          ? client.handshake.headers['x-request-id'][0]
          : client.handshake.headers['x-request-id'];

    if (typeof token !== 'string') {
      this.observability.recordSocketRejected({ requestId, route: 'connect', errorMessage: 'missing token' });
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwt.verifyAsync<SocketAuthPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET')
      });
      if (typeof requestedRestaurantId === 'string' && requestedRestaurantId !== payload.restaurantId) {
        this.observability.recordSocketRejected({ requestId, route: 'connect', userId: payload.sub, role: payload.role, errorMessage: 'restaurant mismatch' });
        client.disconnect(true);
        return;
      }
      if (!['owner', 'manager', 'kitchen', 'support'].includes(payload.role)) {
        this.observability.recordSocketRejected({ requestId, route: 'connect', userId: payload.sub, errorMessage: 'invalid role' });
        client.disconnect(true);
        return;
      }
      client.data.restaurantId = payload.restaurantId;
      client.data.userId = payload.sub;
      client.data.role = payload.role;
      client.data.requestId = requestId;
      void client.join(this.restaurantRoom(payload.restaurantId));
      this.observability.recordSocketConnected({ requestId, userId: payload.sub, role: payload.role, route: 'connect' });
    } catch (error) {
      this.observability.recordSocketRejected({ requestId, route: 'connect', errorMessage: error instanceof Error ? error.message : 'invalid token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.restaurantId) {
      this.observability.recordSocketDisconnected({
        requestId: client.data.requestId,
        userId: client.data.userId,
        role: client.data.role,
        route: 'disconnect'
      });
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
    this.observability.recordSocketEmission({ requestId: body.requestId, route: 'order.created', orderId: body.order.id });
    this.server.to(this.restaurantRoom(body.restaurantId)).emit('order.created', body);
  }

  emitOrderStatusUpdated(body: OrderStatusUpdatedEvent) {
    this.observability.recordSocketEmission({ requestId: body.requestId, route: 'order.status.updated', orderId: body.orderId });
    this.server.to(this.restaurantRoom(body.restaurantId)).emit('order.status.updated', body);
  }

  emitInventoryChanged(body: InventoryChangedEvent) {
    this.observability.recordSocketEmission({ requestId: body.requestId, route: 'inventory.changed' });
    this.server.to(this.restaurantRoom(body.restaurantId)).emit('inventory.changed', body);
  }

  private restaurantRoom(restaurantId: string) {
    return `restaurant:${restaurantId}`;
  }
}
