import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { OrderStatus } from '@kitchenflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationsGateway } from '../../realtime/operations.gateway';
import { ListOrdersDto } from './dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operations: OperationsGateway
  ) {}

  async list(restaurantId: string, query: ListOrdersDto) {
    const createdAt =
      query.dateFrom || query.dateTo
        ? {
            ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: new Date(query.dateTo) } : {})
          }
        : undefined;
    const where = {
      restaurantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.outletId ? { outletId: query.outletId } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(query.query
        ? {
            OR: [
              { publicId: { contains: query.query, mode: 'insensitive' as const } },
              { customerName: { contains: query.query, mode: 'insensitive' as const } }
            ]
          }
        : {})
    };
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { outlet: { select: { name: true, city: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.order.count({ where })
    ]);
    return {
      items: items.map((order) => this.serializeOrder(order)),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit))
    };
  }

  async updateStatus(restaurantId: string, id: string, status: OrderStatus) {
    const order = await this.prisma.order.findFirst({ where: { id, restaurantId } });
    if (!order) throw new NotFoundException('Order not found');
    this.assertValidTransition(order.status, status);
    const previousStatus = order.status;
    const now = new Date();
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status, ...this.timestampForStatus(status, now) },
      include: { outlet: { select: { name: true, city: true } } }
    });
    const serialized = this.serializeOrder(updated);
    this.operations.emitOrderStatusUpdated({
      restaurantId,
      orderId: id,
      previousStatus,
      newStatus: status,
      status,
      outletId: updated.outletId,
      timestamps: this.statusTimestamps(updated),
      order: serialized
    });
    return serialized;
  }

  private assertValidTransition(currentStatus: OrderStatus, nextStatus: OrderStatus) {
    if (currentStatus === nextStatus) {
      throw new BadRequestException(`Order is already ${nextStatus}`);
    }

    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['accepted', 'cancelled'],
      accepted: ['preparing', 'cancelled'],
      preparing: ['dispatched'],
      dispatched: ['delivered'],
      delivered: [],
      cancelled: []
    };

    if (!allowedTransitions[currentStatus].includes(nextStatus)) {
      throw new BadRequestException(`Cannot transition order from ${currentStatus} to ${nextStatus}`);
    }
  }

  private timestampForStatus(status: OrderStatus, date: Date) {
    const timestampFields: Partial<Record<OrderStatus, 'acceptedAt' | 'preparingAt' | 'dispatchedAt' | 'deliveredAt' | 'cancelledAt'>> = {
      accepted: 'acceptedAt',
      preparing: 'preparingAt',
      dispatched: 'dispatchedAt',
      delivered: 'deliveredAt',
      cancelled: 'cancelledAt'
    };
    const field = timestampFields[status];
    return field ? { [field]: date } : {};
  }

  private statusTimestamps(order: {
    acceptedAt: Date | null;
    preparingAt: Date | null;
    dispatchedAt: Date | null;
    deliveredAt: Date | null;
    cancelledAt: Date | null;
  }) {
    return {
      acceptedAt: order.acceptedAt?.toISOString() ?? null,
      preparingAt: order.preparingAt?.toISOString() ?? null,
      dispatchedAt: order.dispatchedAt?.toISOString() ?? null,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      cancelledAt: order.cancelledAt?.toISOString() ?? null
    };
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
  }) {
    const payload = order.payload as { items?: Array<{ id: string; name: string; quantity: number; price: number; modifiers?: string[] }> };
    return {
      id: order.id,
      publicId: order.publicId,
      restaurantId: order.restaurantId,
      outletId: order.outletId,
      outletName: order.outlet.name,
      outletCity: order.outlet.city,
      channel: order.channel,
      status: order.status,
      customerName: order.customerName,
      total: { amount: order.totalAmount, currency: order.currency },
      placedAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      ...this.statusTimestamps(order),
      etaMinutes: order.etaMinutes,
      items:
        payload.items?.map((item, index) => ({
          id: item.id ?? `${order.id}-${index}`,
          name: item.name,
          quantity: item.quantity,
          price: { amount: item.price, currency: order.currency },
          modifiers: item.modifiers
        })) ?? []
    };
  }
}
