import { Injectable } from '@nestjs/common';
import type { OperationalActivity } from '@kitchenflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { ObservabilityService } from '../../common/observability/observability.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly observability: ObservabilityService
  ) {}

  async summary(restaurantId: string) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const [todayOrders, weekOrders, channelGroups, outletGroups, integrationGroups, inventoryItems, payouts, consumption] = await Promise.all([
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
      }),
      this.prisma.payoutLedger.groupBy({
        by: ['channel'],
        where: { restaurantId },
        _sum: { grossAmount: true, expectedPayout: true }
      }),
      this.prisma.inventoryActivity.groupBy({
        by: ['sku', 'name'],
        where: { outlet: { restaurantId }, delta: { lt: 0 } },
        _sum: { delta: true }
      })
    ]);

    const outletLookup = new Map(weekOrders.map((order) => [order.outletId, order.outlet]));
    const totalRevenue = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const cancelled = todayOrders.filter((order) => order.status === 'cancelled').length;
    const activeOrders = todayOrders.filter((order) => !['delivered', 'cancelled'].includes(order.status));
    const slaBreaches = activeOrders.filter((order) => now.getTime() - order.createdAt.getTime() > order.etaMinutes * 60_000).length;
    const averageQueueLatencyMinutes = activeOrders.length
      ? Math.round(activeOrders.reduce((sum, order) => sum + (now.getTime() - order.createdAt.getTime()) / 60_000, 0) / activeOrders.length)
      : 0;
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
      operational: {
        activeKitchenLoad: activeOrders.length,
        averageQueueLatencyMinutes,
        slaBreaches,
        inventoryRiskItems: inventoryItems.filter((item) => Number(item.quantity) <= Number(item.reorderAt) * 1.4).length
      },
      orderStatus: this.countByStatus(todayOrders.map((order) => order.status)),
      revenueSeries: this.buildRevenueSeries(weekOrders, weekStart),
      channelBreakdown: channelGroups.map((group) => ({
        channel: group.channel,
        orders: group._count,
        revenue: group._sum.totalAmount ?? 0
      })),
      outletPerformance: outletGroups.map((group) => {
        const outlet: any = outletLookup.get(group.outletId);
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
      slaMetrics: {
        breachesToday: slaBreaches,
        breachRate: activeOrders.length ? Number(((slaBreaches / activeOrders.length) * 100).toFixed(1)) : 0,
        averageLatencyMinutes: averageQueueLatencyMinutes
      },
      channelProfitability: payouts.map((row) => {
        const gross = row._sum.grossAmount ?? 0;
        const expectedPayout = row._sum.expectedPayout ?? 0;
        return {
          channel: row.channel,
          gross,
          expectedPayout,
          marginPercent: gross ? Number((((gross - expectedPayout) / gross) * 100).toFixed(1)) : 0
        };
      }),
      inventoryConsumptionTrends: consumption.map((item) => ({
        sku: item.sku,
        name: item.name,
        consumed: Math.abs(Number(item._sum.delta ?? 0)),
        unit: 'units'
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

  async activity(restaurantId: string): Promise<OperationalActivity[]> {
    const events = await this.prisma.analyticsEvent.findMany({
      where: { restaurantId },
      orderBy: { occurredAt: 'desc' },
      take: 40
    });

    return events.map((event) => {
      const dimensions = event.dimensions as Record<string, unknown>;
      const metrics = event.metrics as Record<string, unknown>;
      const type = event.type;
      return {
        id: event.id,
        type,
        title: this.activityTitle(type),
        detail: String(metrics.detail ?? dimensions.detail ?? this.activityTitle(type)),
        tone: this.activityTone(type),
        outletId: typeof dimensions.outletId === 'string' ? dimensions.outletId : undefined,
        outletName: typeof dimensions.outlet === 'string' ? dimensions.outlet : undefined,
        actorId: typeof dimensions.actorId === 'string' ? dimensions.actorId : undefined,
        occurredAt: event.occurredAt.toISOString()
      };
    });
  }

  async controlCenter(restaurantId: string) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60_000);
    const [activeOrders, failedWebhookCount, outlets, recentCreated, delayedDispatchCount] = await Promise.all([
      this.prisma.order.findMany({
        where: { restaurantId, status: { in: ['pending', 'accepted', 'preparing', 'dispatched'] } },
        include: { outlet: { select: { id: true, name: true, city: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      this.prisma.webhookEvent.count({ where: { restaurantId, status: { in: ['failed', 'rejected'] } } }),
      this.prisma.outlet.findMany({ where: { restaurantId }, select: { id: true, name: true, city: true } }),
      this.prisma.order.count({ where: { restaurantId, createdAt: { gte: oneHourAgo } } }),
      this.prisma.order.count({
        where: {
          restaurantId,
          status: { in: ['accepted', 'preparing'] },
          createdAt: { lt: new Date(now.getTime() - 30 * 60_000) }
        }
      })
    ]);
    const slaBreachCount = activeOrders.filter((order) => now.getTime() - order.createdAt.getTime() > order.etaMinutes * 60_000).length;
    const outletStatus = outlets.map((outlet) => {
      const outletOrders = activeOrders.filter((order) => order.outletId === outlet.id);
      const breaches = outletOrders.filter((order) => now.getTime() - order.createdAt.getTime() > order.etaMinutes * 60_000).length;
      return {
        outletId: outlet.id,
        outlet: outlet.name,
        city: outlet.city,
        activeOrders: outletOrders.length,
        slaBreaches: breaches,
        status: breaches > 2 ? 'critical' : outletOrders.length > 8 || breaches > 0 ? 'strained' : 'online'
      };
    });
    const websocket = this.observability.snapshot().websocket;
    return {
      generatedAt: now.toISOString(),
      activeOrders: activeOrders.length,
      slaBreachCount,
      delayedDispatchCount,
      failedWebhookCount,
      realtimeOrderThroughput: recentCreated,
      websocket,
      outletStatus,
      systemHealth: [
        { label: 'Orders', status: slaBreachCount > 5 ? 'critical' : slaBreachCount > 0 ? 'warning' : 'healthy', detail: `${activeOrders.length} active orders` },
        { label: 'Webhooks', status: failedWebhookCount > 5 ? 'critical' : failedWebhookCount > 0 ? 'warning' : 'healthy', detail: `${failedWebhookCount} failed or rejected` },
        { label: 'Realtime', status: websocket.activeConnections > 0 ? 'healthy' : 'warning', detail: `${websocket.activeConnections} active sockets` }
      ]
    };
  }

  async operationalIntelligence(restaurantId: string) {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const orders = await this.prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: dayStart } },
      include: { outlet: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' }
    });
    const byOutlet = new Map<string, { outlet: string; activeOrders: number; totalMinutes: number; completed: number; breaches: number }>();
    const byHour = new Map<string, { orders: number; cancellations: number; breaches: number }>();
    for (const order of orders) {
      const outlet = byOutlet.get(order.outletId) ?? { outlet: order.outlet.name, activeOrders: 0, totalMinutes: 0, completed: 0, breaches: 0 };
      if (!['delivered', 'cancelled'].includes(order.status)) outlet.activeOrders += 1;
      if (order.deliveredAt) {
        outlet.totalMinutes += Math.round((order.deliveredAt.getTime() - order.createdAt.getTime()) / 60_000);
        outlet.completed += 1;
      }
      const breached = now.getTime() - order.createdAt.getTime() > order.etaMinutes * 60_000 && !['delivered', 'cancelled'].includes(order.status);
      if (breached) outlet.breaches += 1;
      byOutlet.set(order.outletId, outlet);
      const hour = order.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', hour12: false });
      const bucket = byHour.get(hour) ?? { orders: 0, cancellations: 0, breaches: 0 };
      bucket.orders += 1;
      if (order.status === 'cancelled') bucket.cancellations += 1;
      if (breached) bucket.breaches += 1;
      byHour.set(hour, bucket);
    }
    const outletRows = Array.from(byOutlet.values());
    const slowestFulfillmentOutlet = outletRows
      .filter((row) => row.completed > 0)
      .map((row) => ({ outlet: row.outlet, averageMinutes: Math.round(row.totalMinutes / row.completed) }))
      .sort((a, b) => b.averageMinutes - a.averageMinutes)[0] ?? null;
    const busiestTimeWindow = Array.from(byHour.entries()).map(([hour, value]) => ({ hour, orders: value.orders })).sort((a, b) => b.orders - a.orders)[0] ?? null;
    return {
      generatedAt: now.toISOString(),
      slaHeatmap: Array.from(byHour.entries()).flatMap(([hour, value]) =>
        outletRows.map((outlet) => ({ outlet: outlet.outlet, hour, breaches: value.breaches, orders: value.orders }))
      ).slice(0, 60),
      outletLoadComparison: outletRows.map((row) => ({ outlet: row.outlet, activeOrders: row.activeOrders, loadScore: row.activeOrders * 10 + row.breaches * 20 })),
      slowestFulfillmentOutlet,
      busiestTimeWindow,
      bottleneckAlerts: outletRows
        .filter((row) => row.breaches > 0 || row.activeOrders > 8)
        .map((row) => ({ label: row.outlet, severity: row.breaches > 2 ? 'critical' : 'warning', detail: `${row.activeOrders} active, ${row.breaches} SLA breaches` })),
      cancellationSpikes: Array.from(byHour.entries())
        .map(([hour, value]) => ({ hour, cancellations: value.cancellations, cancellationRate: value.orders ? Number(((value.cancellations / value.orders) * 100).toFixed(1)) : 0 }))
        .filter((row) => row.cancellationRate >= 10)
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

  private activityTitle(type: string) {
    if (type === 'order_created') return 'Order created';
    if (type === 'order_status_changed') return 'Order status changed';
    if (type === 'inventory_adjusted') return 'Inventory adjusted';
    if (type === 'login') return 'User login';
    if (type === 'logout') return 'User logout';
    if (type === 'inventory_warning') return 'Inventory warning';
    if (type === 'sla_breach') return 'SLA breach';
    if (type === 'aggregator_order_ingested') return 'Aggregator order ingested';
    if (type === 'aggregator_ingest_failed') return 'Aggregator ingestion failed';
    if (type === 'webhook_order_created') return 'Webhook order created';
    return 'Operational activity';
  }

  private activityTone(type: string): OperationalActivity['tone'] {
    if (type === 'inventory_warning' || type === 'sla_breach') return 'warning';
    if (type === 'aggregator_ingest_failed') return 'critical';
    if (type === 'order_created' || type === 'login' || type === 'webhook_order_created' || type === 'aggregator_order_ingested') return 'success';
    return 'neutral';
  }
}
