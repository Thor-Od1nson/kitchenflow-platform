import { Controller, Get } from '@nestjs/common';
import type { OperationalMetrics } from '@kitchenflow/types';
import { ObservabilityService } from '../../common/observability/observability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QueuesService } from '../queues/queues.service';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly observability: ObservabilityService,
    private readonly prisma: PrismaService,
    private readonly queues: QueuesService
  ) {}

  @Get()
  async metrics(): Promise<OperationalMetrics> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [ordersToday, activeOrders, inventoryItems, activeOrdersForLatency, queueMetrics, webhookFailures] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.order.count({ where: { status: { in: ['pending', 'accepted', 'preparing', 'dispatched'] } } }),
      this.prisma.inventoryItem.findMany({ select: { quantity: true, reorderAt: true } }),
      this.prisma.order.findMany({
        where: { status: { in: ['pending', 'accepted', 'preparing', 'dispatched'] } },
        select: { createdAt: true, etaMinutes: true }
      }),
      this.queues.metrics(),
      this.prisma.webhookEvent.count({ where: { status: { in: ['failed', 'rejected'] }, createdAt: { gte: todayStart } } })
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
      queues: {
        ...snapshot.queues,
        active: queueMetrics.counts.active,
        failed: queueMetrics.counts.failed,
        retryCount: queueMetrics.retryCount,
        dlqJobs: queueMetrics.dlqCount ?? snapshot.queues.dlqJobs
      },
      webhooks: {
        failures: Math.max(snapshot.webhooks.failures, webhookFailures)
      },
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
