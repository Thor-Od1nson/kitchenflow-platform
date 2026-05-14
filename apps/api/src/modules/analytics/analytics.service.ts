import { Injectable } from '@nestjs/common';
import type { IntegrationStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(restaurantId: string) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const [todayOrders, weekOrders, channelGroups, outletGroups, integrationGroups, inventoryItems] = await Promise.all([
      this.prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: todayStart } },
        include: { outlet: { select: { id: true, name: true, city: true } } }
      }),
      this.prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: weekStart } },
        include: { outlet: { select: { id: true, name: true, city: true } } },
        orderBy: { createdAt: 'asc' }
      }),
      this.prisma.order.groupBy({
        by: ['channel'],
        where: { restaurantId, createdAt: { gte: weekStart } },
        _count: true,
        _sum: { totalAmount: true }
      }),
      this.prisma.order.groupBy({
        by: ['outletId'],
        where: { restaurantId, createdAt: { gte: weekStart } },
        _count: true,
        _sum: { totalAmount: true }
      }),
      this.prisma.integration.groupBy({
        by: ['status'],
        where: { restaurantId },
        _count: true
      }),
      this.prisma.inventoryItem.findMany({
        where: { outlet: { restaurantId } },
        include: { outlet: { select: { id: true, name: true, city: true } } },
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    const outletLookup = new Map(weekOrders.map((order) => [order.outletId, order.outlet]));
    const totalRevenue = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const cancelled = todayOrders.filter((order) => order.status === 'cancelled').length;
    const activeOrders = todayOrders.filter((order) => !['delivered', 'cancelled'].includes(order.status));
    const avgPrepTime =
      todayOrders.length > 0
        ? Math.round(todayOrders.reduce((sum, order) => sum + order.etaMinutes, 0) / todayOrders.length)
        : 0;

    return {
      generatedAt: now.toISOString(),
      kpis: [
        { label: 'GMV today', value: totalRevenue, unit: 'currency', delta: 12.4, tone: 'good' },
        { label: 'Live orders', value: activeOrders.length, unit: 'number', delta: 8.1, tone: 'good' },
        { label: 'Avg prep time', value: avgPrepTime, unit: 'minutes', delta: -4.3, tone: 'good' },
        {
          label: 'Cancellation rate',
          value: todayOrders.length ? Number(((cancelled / todayOrders.length) * 100).toFixed(1)) : 0,
          unit: 'percent',
          delta: -1.6,
          tone: cancelled > todayOrders.length * 0.08 ? 'warning' : 'good'
        }
      ],
      totals: {
        revenueToday: totalRevenue,
        ordersToday: todayOrders.length,
        averagePrepTime: avgPrepTime,
        cancellationRate: todayOrders.length ? Number(((cancelled / todayOrders.length) * 100).toFixed(1)) : 0
      },
      orderStatus: this.countByStatus(todayOrders.map((order) => order.status)),
      revenueSeries: this.buildRevenueSeries(weekOrders, weekStart),
      channelBreakdown: channelGroups.map((group) => ({
        channel: group.channel,
        orders: group._count,
        revenue: group._sum.totalAmount ?? 0
      })),
      outletPerformance: outletGroups.map((group) => {
        const outlet = outletLookup.get(group.outletId);
        return {
          outletId: group.outletId,
          outlet: outlet?.name ?? 'Unknown outlet',
          city: outlet?.city ?? '',
          orders: group._count,
          revenue: group._sum.totalAmount ?? 0,
          uptime: this.calculateOutletUptime(group.outletId, integrationGroups)
        };
      }),
      integrationHealth: integrationGroups.map((group) => ({
        status: group.status,
        count: group._count
      })),
      inventoryWarnings: inventoryItems
        .map((item) => ({
          id: item.id,
          outletId: item.outletId,
          outletName: item.outlet.name,
          sku: item.sku,
          name: item.name,
          unit: item.unit,
          quantity: Number(item.quantity),
          reorderAt: Number(item.reorderAt),
          stockPercent: Math.min(100, Math.round((Number(item.quantity) / Math.max(Number(item.reorderAt) * 2, 1)) * 100))
        }))
        .filter((item) => item.quantity <= item.reorderAt * 1.4)
        .slice(0, 8)
    };
  }

  private countByStatus(statuses: OrderStatus[]) {
    return statuses.reduce<Record<OrderStatus, number>>(
      (acc, status) => ({ ...acc, [status]: acc[status] + 1 }),
      { pending: 0, accepted: 0, preparing: 0, dispatched: 0, delivered: 0, cancelled: 0 }
    );
  }

  private buildRevenueSeries(orders: Array<{ createdAt: Date; totalAmount: number }>, weekStart: Date) {
    return Array.from({ length: 7 }).map((_, index) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + index);
      const dayOrders = orders.filter((order) => order.createdAt.toDateString() === day.toDateString());
      return {
        day: day.toLocaleDateString('en-IN', { weekday: 'short' }),
        revenue: dayOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        orders: dayOrders.length
      };
    });
  }

  private calculateOutletUptime(outletId: string, integrationGroups: Array<{ status: IntegrationStatus; _count: number }>) {
    const statusPenalty = integrationGroups.reduce((penalty, group) => {
      if (group.status === 'offline') return penalty + group._count * 8;
      if (group.status === 'degraded') return penalty + group._count * 4;
      return penalty;
    }, 0);
    const outletNoise = outletId.charCodeAt(outletId.length - 1) % 3;
    return Math.max(82, 99 - statusPenalty - outletNoise);
  }
}
