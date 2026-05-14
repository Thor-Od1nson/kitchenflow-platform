import { Injectable, NotFoundException } from '@nestjs/common';
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
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: { outlet: { select: { name: true, city: true } } }
    });
    const serialized = this.serializeOrder(updated);
    this.operations.emitOrderStatusUpdated({ restaurantId, orderId: id, status, order: serialized });
    return serialized;
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
