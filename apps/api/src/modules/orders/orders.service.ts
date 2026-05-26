import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Channel, Money, Order, OrderStatus } from '@kitchenflow/types';
import { AuditService } from '../../common/audit/audit.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { normalizeCity, normalizeCurrency, normalizeCustomerName, normalizeOperationalText, normalizeOutletName, normalizeProvider, normalizePublicId, orderPrefixForLocation } from '../../common/operational-normalization';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationsGateway } from '../../realtime/operations.gateway';
import { CreateOrderDto, ListOrdersDto } from './dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operations: OperationsGateway,
    private readonly audit: AuditService
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

  async create(user: AuthenticatedUser, dto: CreateOrderDto, correlationId?: string) {
    const restaurantId = user.restaurantId;
    if (!dto.items?.length) {
      throw new BadRequestException('Order must include at least one item');
    }

    if (dto.clientMutationId) {
      const existing = await this.prisma.order.findFirst({
        where: {
          restaurantId,
          payload: { path: ['clientMutationId'], equals: dto.clientMutationId }
        },
        include: { outlet: { select: { name: true, city: true } } }
      });
      if (existing) return this.serializeOrder(existing);
    }

    const outlet = await this.prisma.outlet.findFirst({
      where: { id: dto.outletId, restaurantId },
      select: { id: true, name: true, city: true }
    });
    if (!outlet) throw new NotFoundException('Outlet not found');

    const menuItems: any = await this.prisma.menuItem.findMany({
      where: {
        restaurantId,
        id: { in: dto.items.map((item) => item.menuItemId) }
      },
      select: { id: true, name: true, priceAmount: true, currency: true, variants: true }
    });
    const menuLookup = new Map<string, any>(menuItems.map((item: any) => [item.id, item]));

    const lines = dto.items.map((item) => {
      const menuItem: any = menuLookup.get(item.menuItemId);
      if (!menuItem) throw new BadRequestException('One or more menu items are unavailable');
      return {
        id: `${menuItem.id}-${Date.now()}`,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.priceAmount,
        modifiers: []
      };
    });

    const totalAmount = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const created = await this.prisma.order.create({
      data: {
        publicId: this.createPublicId(outlet.city),
        restaurantId,
        outletId: outlet.id,
        channel: dto.channel,
        customerName: dto.customerName,
        totalAmount,
        currency: menuItems[0]?.currency ?? 'AED',
        etaMinutes: dto.etaMinutes,
        payload: { items: lines, source: 'manual', clientMutationId: dto.clientMutationId }
      },
      include: { outlet: { select: { name: true, city: true } } }
    });

    const serialized = this.serializeOrder(created);
    await this.prisma.analyticsEvent.create({
      data: {
        restaurantId,
        type: 'order_created',
        dimensions: { outletId: outlet.id, outlet: outlet.name, channel: dto.channel },
        metrics: { orderId: created.id, publicId: created.publicId, detail: `${created.publicId} created for ${created.customerName}` }
      }
    });
    await this.audit.record({
      restaurantId,
      actorUserId: user.userId,
      actorRole: user.role,
      action: 'order.created',
      entityType: 'order',
      entityId: created.id,
      outletId: outlet.id,
      outletName: outlet.name,
      metadata: { publicId: created.publicId, channel: dto.channel, totalAmount },
      correlationId
    });
    this.operations.emitOrderCreated({ requestId: correlationId, restaurantId, order: serialized });
    return serialized;
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: OrderStatus, expectedUpdatedAt?: string, correlationId?: string) {
    const restaurantId = user.restaurantId;
    const order = await this.prisma.order.findFirst({ where: { id, restaurantId } });
    if (!order) throw new NotFoundException('Order not found');
    if (expectedUpdatedAt && order.updatedAt.toISOString() !== expectedUpdatedAt) {
      throw new BadRequestException('Order changed since it was last loaded. Refresh and try again.');
    }
    this.assertValidTransition(order.status, status);
    const previousStatus = order.status;
    const now = new Date();
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status, ...this.timestampForStatus(status, now) },
      include: { outlet: { select: { name: true, city: true } } }
    });
    const serialized = this.serializeOrder(updated);
    await this.prisma.analyticsEvent.create({
      data: {
        restaurantId,
        type: 'order_status_changed',
        dimensions: { outletId: updated.outletId, outlet: updated.outlet.name, channel: updated.channel },
        metrics: { orderId: id, publicId: updated.publicId, from: previousStatus, to: status, detail: `${updated.publicId} moved from ${previousStatus} to ${status}` }
      }
    });
    await this.audit.record({
      restaurantId,
      actorUserId: user.userId,
      actorRole: user.role,
      action: 'order.status_changed',
      entityType: 'order',
      entityId: id,
      outletId: updated.outletId,
      outletName: updated.outlet.name,
      metadata: { publicId: updated.publicId, from: previousStatus, to: status },
      correlationId
    });
    this.operations.emitOrderStatusUpdated({
      requestId: correlationId,
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

  private createPublicId(city: string) {
    const prefix = orderPrefixForLocation(city);
    return `#${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;
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
    const currency = normalizeCurrency(order.currency) as Money['currency'];
    const outletName = normalizeOutletName(order.outlet.name);
    const outletCity = normalizeCity(order.outlet.city);
    return {
      id: order.id,
      publicId: normalizePublicId(order.publicId, outletCity || outletName),
      restaurantId: order.restaurantId,
      outletId: order.outletId,
      outletName,
      outletCity,
      channel: normalizeProvider(order.channel) as Channel,
      status: order.status,
      customerName: normalizeCustomerName(order.customerName),
      total: { amount: order.totalAmount, currency },
      placedAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      ...this.statusTimestamps(order),
      etaMinutes: order.etaMinutes,
      items:
        payload.items?.map((item, index) => ({
          id: item.id ?? `${order.id}-${index}`,
          name: normalizeOperationalText(item.name),
          quantity: item.quantity,
          price: { amount: item.price, currency },
          modifiers: item.modifiers
        })) ?? []
    };
  }
}
