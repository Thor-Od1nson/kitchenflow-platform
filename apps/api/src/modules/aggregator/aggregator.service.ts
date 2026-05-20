import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Channel, Money, Order, OrderStatus } from '@kitchenflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationsGateway } from '../../realtime/operations.gateway';
import { QueuesService } from '../queues/queues.service';

const providers: Channel[] = ['swiggy', 'zomato', 'uber_eats'];
const customers = ['Aarav Sharma', 'Mira Iyer', 'Kabir Mehta', 'Nisha Rao', 'Dev Malhotra', 'Anika Sen'];

@Injectable()
export class AggregatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operations: OperationsGateway,
    private readonly queues: QueuesService
  ) {}

  async simulate(restaurantId: string, options: { count: number; failureRate: number; requestId?: string }) {
    const [outlets, menuItems] = await Promise.all([
      this.prisma.outlet.findMany({ where: { restaurantId }, take: 20 }),
      this.prisma.menuItem.findMany({ where: { restaurantId, available: true }, take: 20 })
    ]);
    if (!outlets.length || !menuItems.length) return { created: 0, failed: 0, orders: [] };

    const results = [];
    let failed = 0;
    for (let index = 0; index < options.count; index += 1) {
      if (Math.random() < options.failureRate) {
        failed += 1;
        await this.prisma.analyticsEvent.create({
          data: {
            restaurantId,
            type: 'aggregator_ingest_failed',
            dimensions: { provider: this.pick(providers, index) },
            metrics: { detail: 'Simulated aggregator retry/failure' }
          }
        });
        continue;
      }

      const outlet = this.pick(outlets, index);
      const firstItem = this.pick(menuItems, index);
      const secondItem = this.pick(menuItems, index + 2);
      const channel = this.pick(providers, index + Date.now());
      const quantity = (index % 2) + 1;
      const lines = [
        { id: `${firstItem.id}-${Date.now()}-${index}`, name: firstItem.name, quantity, price: firstItem.priceAmount },
        { id: `${secondItem.id}-${Date.now()}-${index}-b`, name: secondItem.name, quantity: 1, price: secondItem.priceAmount }
      ];
      const totalAmount = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const created = await this.prisma.order.create({
        data: {
          publicId: this.createPublicId(outlet.city),
          restaurantId,
          outletId: outlet.id,
          channel,
          customerName: this.pick(customers, index),
          totalAmount,
          currency: firstItem.currency,
          etaMinutes: 18 + (index % 12),
          payload: {
            source: 'aggregator-simulator',
            externalOrderId: `${channel}-${Date.now()}-${index}`,
            retryAttempt: 0,
            items: lines
          } as Prisma.InputJsonValue
        },
        include: { outlet: { select: { name: true, city: true } } }
      });
      const order = this.serializeOrder(created);
      this.operations.emitOrderCreated({ requestId: options.requestId, restaurantId, order });
      await this.prisma.analyticsEvent.create({
        data: {
          restaurantId,
          type: 'aggregator_order_ingested',
          dimensions: { channel, outletId: outlet.id, outlet: outlet.name },
          metrics: { orderId: created.id, publicId: created.publicId, detail: `${channel} order ingested` }
        }
      });
      await this.scheduleLifecycle(restaurantId, created.id, options.requestId);
      results.push(order);
    }

    await this.queues.enqueueSlaScan(restaurantId, 30_000, options.requestId);
    await this.queues.enqueueOrderAging(restaurantId, 45_000, options.requestId);
    return { created: results.length, failed, orders: results };
  }

  private async scheduleLifecycle(restaurantId: string, orderId: string, requestId?: string) {
    await this.queues.enqueueOrderStatus(restaurantId, orderId, 'accepted', 8_000, requestId);
    await this.queues.enqueueOrderStatus(restaurantId, orderId, 'preparing', 18_000, requestId);
    await this.queues.enqueueOrderStatus(restaurantId, orderId, 'dispatched', 35_000, requestId);
    await this.queues.enqueueOrderStatus(restaurantId, orderId, Math.random() > 0.08 ? 'delivered' : 'cancelled', 55_000, requestId);
  }

  private pick<T>(items: T[], index: number) {
    return items[Math.abs(index) % items.length];
  }

  private createPublicId(city: string) {
    return `#${city.slice(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;
  }

  private serializeOrder(order: {
    id: string;
    publicId: string;
    restaurantId: string;
    outletId: string;
    channel: string;
    status: OrderStatus;
    customerName: string;
    totalAmount: number;
    currency: string;
    payload: unknown;
    etaMinutes: number;
    acceptedAt: Date | null;
    preparingAt: Date | null;
    dispatchedAt: Date | null;
    deliveredAt: Date | null;
    cancelledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    outlet: { name: string; city: string };
  }): Order {
    const payload = order.payload as { items?: Array<{ id: string; name: string; quantity: number; price: number; modifiers?: string[] }> };
    return {
      id: order.id,
      publicId: order.publicId,
      restaurantId: order.restaurantId,
      outletId: order.outletId,
      outletName: order.outlet.name,
      outletCity: order.outlet.city,
      channel: order.channel as Channel,
      status: order.status,
      customerName: order.customerName,
      total: { amount: order.totalAmount, currency: order.currency as Money['currency'] },
      placedAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      acceptedAt: order.acceptedAt?.toISOString() ?? null,
      preparingAt: order.preparingAt?.toISOString() ?? null,
      dispatchedAt: order.dispatchedAt?.toISOString() ?? null,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      cancelledAt: order.cancelledAt?.toISOString() ?? null,
      etaMinutes: order.etaMinutes,
      items:
        payload.items?.map((item, index) => ({
          id: item.id ?? `${order.id}-${index}`,
          name: item.name,
          quantity: item.quantity,
          price: { amount: item.price, currency: order.currency as Money['currency'] },
          modifiers: item.modifiers
        })) ?? []
    };
  }
}
