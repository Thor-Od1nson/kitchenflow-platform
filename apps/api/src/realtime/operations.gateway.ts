import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'], credentials: true },
  namespace: 'operations'
})
export class OperationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const restaurantId = client.handshake.auth.restaurantId;
    if (restaurantId) void client.join(`restaurant:${restaurantId}`);
  }

  @SubscribeMessage('order.status.updated')
  broadcastOrderStatus(@MessageBody() body: { restaurantId: string; orderId: string; status: string; previousStatus?: string; newStatus?: string }) {
    this.emitOrderStatusUpdated(body);
    return { ok: true };
  }

  @SubscribeMessage('inventory.changed')
  broadcastInventory(@MessageBody() body: { restaurantId: string; outletId: string; sku: string; quantity: number }) {
    this.emitInventoryChanged(body);
    return { ok: true };
  }

  @SubscribeMessage('notifications.join')
  joinNotifications(@ConnectedSocket() client: Socket, @MessageBody() body: { restaurantId: string }) {
    void client.join(`restaurant:${body.restaurantId}`);
    return { ok: true };
  }

  emitOrderCreated(body: { restaurantId: string; order: unknown }) {
    this.server.to(`restaurant:${body.restaurantId}`).emit('order.created', body);
  }

  emitOrderStatusUpdated(body: {
    restaurantId: string;
    orderId: string;
    outletId?: string;
    status: string;
    previousStatus?: string;
    newStatus?: string;
    timestamps?: Record<string, string | null>;
    order?: unknown;
  }) {
    this.server.to(`restaurant:${body.restaurantId}`).emit('order.status.updated', body);
  }

  emitInventoryChanged(body: { restaurantId: string; outletId: string; sku: string; quantity: number; item?: unknown }) {
    this.server.to(`restaurant:${body.restaurantId}`).emit('inventory.changed', body);
  }
}
