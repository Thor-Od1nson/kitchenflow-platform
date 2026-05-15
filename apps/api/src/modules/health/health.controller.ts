import { Controller, Get } from '@nestjs/common';
import type { OperationalMetrics } from '@kitchenflow/types';
import { ObservabilityService } from '../../common/observability/observability.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly observability: ObservabilityService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  check() {
    return {
      status: 'ok',
      service: 'kitchenflow-api',
      checkedAt: new Date().toISOString()
    };
  }

  @Get('ready')
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ready',
      service: 'kitchenflow-api',
      checkedAt: new Date().toISOString()
    };
  }

  @Get('metrics')
  async metrics(): Promise<OperationalMetrics> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [ordersToday, activeOrders, inventoryItems, activeOrdersForLatency] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.order.count({ where: { status: { in: ['pending', 'accepted', 'preparing', 'dispatched'] } } }),
      this.prisma.inventoryItem.findMany({ select: { quantity: true, reorderAt: true } }),
      this.prisma.order.findMany({
        where: { status: { in: ['pending', 'accepted', 'preparing', 'dispatched'] } },
        select: { createdAt: true, etaMinutes: true }
      })
    ]);
    const latencyMinutes = activeOrdersForLatency.length
      ? Math.round(activeOrdersForLatency.reduce((sum, order) => sum + (now.getTime() - order.createdAt.getTime()) / 60_000, 0) / activeOrdersForLatency.length)
      : 0;
    const slaBreachesToday = activeOrdersForLatency.filter((order) => now.getTime() - order.createdAt.getTime() > order.etaMinutes * 60_000).length;
    const inventoryRiskItems = inventoryItems.filter((item) => Number(item.quantity) <= Number(item.reorderAt) * 1.4).length;
    const snapshot = this.observability.snapshot();

    return {
      generatedAt: now.toISOString(),
      ...snapshot,
      operations: {
        ordersToday,
        activeOrders,
        averageQueueLatencyMinutes: latencyMinutes,
        slaBreachesToday,
        inventoryRiskItems
      }
    };
  }
}
