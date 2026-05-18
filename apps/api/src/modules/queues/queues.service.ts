import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import { Prisma } from '@prisma/client';
import type { OrderStatus } from '@kitchenflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationsGateway } from '../../realtime/operations.gateway';

type QueuePayload =
  | { type: 'order-status'; restaurantId: string; orderId: string; status: OrderStatus }
  | { type: 'sla-scan'; restaurantId?: string }
  | { type: 'notification'; restaurantId: string; detail: string }
  | { type: 'order-aging'; restaurantId?: string }
  | { type: 'test-failure'; restaurantId: string };

const terminalStatuses = ['delivered', 'cancelled'];

@Injectable()
export class QueuesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueuesService.name);
  private queue?: Queue<QueuePayload>;
  private worker?: Worker<QueuePayload>;
  private heartbeat?: NodeJS.Timeout;
  private workerHeartbeatAt: Date | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly operations: OperationsGateway
  ) {}

  onModuleInit() {
    const connection = this.redisConnection();
    if (!connection) {
      this.logger.warn('REDIS_URL is not configured. Queue jobs will be recorded but not processed.');
      return;
    }

    this.queue = new Queue<QueuePayload>('kitchenflow-ops', { connection });
    this.worker = new Worker<QueuePayload>('kitchenflow-ops', (job) => this.process(job), {
      connection,
      concurrency: 4
    });
    this.workerHeartbeatAt = new Date();
    this.heartbeat = setInterval(() => {
      this.workerHeartbeatAt = new Date();
    }, 10_000);
    this.worker.on('failed', (job, error) => {
      void this.recordActivity({
        restaurantId: job?.data && 'restaurantId' in job.data ? job.data.restaurantId : undefined,
        queue: 'kitchenflow-ops',
        jobName: job?.name ?? 'unknown',
        jobId: job?.id,
        status: 'failed',
        detail: error.message,
        payload: { ...(job?.data ?? {}), attemptsMade: job?.attemptsMade ?? 0 }
      });
    });
  }

  async onModuleDestroy() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueueOrderStatus(restaurantId: string, orderId: string, status: OrderStatus, delayMs: number) {
    return this.enqueue('order-status', { type: 'order-status', restaurantId, orderId, status }, delayMs, 3);
  }

  async enqueueSlaScan(restaurantId?: string, delayMs = 60_000) {
    return this.enqueue('sla-scan', { type: 'sla-scan', restaurantId }, delayMs, 2);
  }

  async enqueueNotification(restaurantId: string, detail: string, delayMs: number) {
    return this.enqueue('notification', { type: 'notification', restaurantId, detail }, delayMs, 3);
  }

  async enqueueOrderAging(restaurantId?: string, delayMs = 120_000) {
    return this.enqueue('order-aging', { type: 'order-aging', restaurantId }, delayMs, 2);
  }

  async enqueueTestFailure(restaurantId: string) {
    return this.enqueue('test-failure', { type: 'test-failure', restaurantId }, 0, 2);
  }

  async recentActivity(restaurantId: string) {
    return this.prisma.jobActivity.findMany({
      where: { OR: [{ restaurantId }, { restaurantId: null }] },
      orderBy: { createdAt: 'desc' },
      take: 30
    });
  }

  async metrics() {
    const counts = this.queue
      ? await this.queue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed', 'paused')
      : { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0, paused: 0 };
    const recent = await this.prisma.jobActivity.findMany({
      where: { status: { in: ['completed', 'failed'] } },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    const durations = recent
      .map((row) => {
        const payload = row.payload as { processingMs?: unknown };
        return typeof payload.processingMs === 'number' ? payload.processingMs : null;
      })
      .filter((value): value is number => typeof value === 'number');
    const retryCount = recent.reduce((sum, row) => {
      const payload = row.payload as { attemptsMade?: unknown };
      return sum + (typeof payload.attemptsMade === 'number' ? payload.attemptsMade : 0);
    }, 0);
    const heartbeatAgeMs = this.workerHeartbeatAt ? Date.now() - this.workerHeartbeatAt.getTime() : Number.POSITIVE_INFINITY;
    return {
      generatedAt: new Date().toISOString(),
      workerHeartbeatAt: this.workerHeartbeatAt?.toISOString() ?? null,
      workerOnline: Boolean(this.worker && heartbeatAgeMs < 30_000),
      counts: {
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        delayed: counts.delayed ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
        paused: counts.paused ?? 0,
        backlog: (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0)
      },
      retryCount,
      averageProcessingMs: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0
    };
  }

  private async enqueue(name: string, payload: QueuePayload, delayMs: number, attempts: number) {
    if (!this.queue) {
      await this.recordActivity({
        restaurantId: 'restaurantId' in payload ? payload.restaurantId : undefined,
        queue: 'kitchenflow-ops',
        jobName: name,
        status: 'skipped',
        detail: 'Redis queue unavailable',
        payload
      });
      return null;
    }

    const job = await this.queue.add(name, payload, {
      attempts,
      delay: delayMs,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 200,
      removeOnFail: 500
    });
    await this.recordActivity({
      restaurantId: 'restaurantId' in payload ? payload.restaurantId : undefined,
      queue: 'kitchenflow-ops',
      jobName: name,
      jobId: job.id,
      status: 'queued',
      detail: `${name} queued`,
      payload
    });
    return job;
  }

  private async process(job: Job<QueuePayload>) {
    const payload = job.data;
    const startedAt = Date.now();
    this.workerHeartbeatAt = new Date();
    if (payload.type === 'order-status') {
      await this.processOrderStatus(payload.restaurantId, payload.orderId, payload.status, job, startedAt);
    } else if (payload.type === 'sla-scan') {
      await this.processSlaScan(payload.restaurantId, job, startedAt);
    } else if (payload.type === 'order-aging') {
      await this.processOrderAging(payload.restaurantId, job, startedAt);
    } else if (payload.type === 'test-failure') {
      throw new Error('Intentional queue failure for reliability smoke test');
    } else {
      await this.recordActivity({
        restaurantId: payload.restaurantId,
        queue: job.queueName,
        jobName: job.name,
        jobId: job.id,
        status: 'completed',
        detail: payload.detail,
        payload: { ...payload, attemptsMade: job.attemptsMade, processingMs: Date.now() - startedAt }
      });
    }
  }

  private async processOrderStatus(restaurantId: string, orderId: string, status: OrderStatus, job: Job<QueuePayload>, startedAt: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: { outlet: { select: { name: true, city: true } } }
    });
    if (!order || terminalStatuses.includes(order.status)) return;
    const previousStatus = order.status as OrderStatus;
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status, ...this.timestampForStatus(status) },
      include: { outlet: { select: { name: true, city: true } } }
    });
    const serialized = this.serializeOrder(updated);
    this.operations.emitOrderStatusUpdated({
      restaurantId,
      orderId,
      outletId: updated.outletId,
      previousStatus,
      newStatus: status,
      status,
      timestamps: this.statusTimestamps(updated),
      order: serialized
    });
    await this.recordActivity({
      restaurantId,
      queue: job.queueName,
      jobName: job.name,
      jobId: job.id,
      status: 'completed',
      detail: `${updated.publicId} advanced to ${status}`,
      payload: { ...job.data, attemptsMade: job.attemptsMade, processingMs: Date.now() - startedAt }
    });
  }

  private async processSlaScan(restaurantId: string | undefined, job: Job<QueuePayload>, startedAt: number) {
    const now = new Date();
    const breached = await this.prisma.order.findMany({
      where: {
        ...(restaurantId ? { restaurantId } : {}),
        status: { in: ['pending', 'accepted', 'preparing', 'dispatched'] },
        createdAt: { lt: new Date(now.getTime() - 10 * 60_000) }
      },
      take: 50,
      include: { outlet: { select: { name: true } } }
    });
    await Promise.all(
      breached.map((order) =>
        this.prisma.analyticsEvent.create({
          data: {
            restaurantId: order.restaurantId,
            type: 'sla_breach',
            dimensions: { outletId: order.outletId, outlet: order.outlet.name, channel: order.channel },
            metrics: { orderId: order.id, publicId: order.publicId, detail: `${order.publicId} is aging beyond SLA` }
          }
        })
      )
    );
    await this.recordActivity({
      restaurantId,
      queue: job.queueName,
      jobName: job.name,
      jobId: job.id,
      status: 'completed',
      detail: `${breached.length} SLA candidates scanned`,
      payload: { ...job.data, attemptsMade: job.attemptsMade, processingMs: Date.now() - startedAt }
    });
  }

  private async processOrderAging(restaurantId: string | undefined, job: Job<QueuePayload>, startedAt: number) {
    const aging = await this.prisma.order.count({
      where: {
        ...(restaurantId ? { restaurantId } : {}),
        status: { in: ['pending', 'accepted', 'preparing', 'dispatched'] }
      }
    });
    await this.recordActivity({
      restaurantId,
      queue: job.queueName,
      jobName: job.name,
      jobId: job.id,
      status: 'completed',
      detail: `${aging} active orders checked for aging`,
      payload: { ...job.data, attemptsMade: job.attemptsMade, processingMs: Date.now() - startedAt }
    });
  }

  private async recordActivity(input: {
    restaurantId?: string;
    queue: string;
    jobName: string;
    jobId?: string;
    status: string;
    detail: string;
    payload: unknown;
  }) {
    await this.prisma.jobActivity.create({
      data: {
        restaurantId: input.restaurantId,
        queue: input.queue,
        jobName: input.jobName,
        jobId: input.jobId,
        status: input.status,
        detail: input.detail,
        payload: input.payload as Prisma.InputJsonValue
      }
    });
  }

  private redisConnection() {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) return null;
    return { url: redisUrl };
  }

  private timestampForStatus(status: OrderStatus) {
    const now = new Date();
    if (status === 'accepted') return { acceptedAt: now };
    if (status === 'preparing') return { preparingAt: now };
    if (status === 'dispatched') return { dispatchedAt: now };
    if (status === 'delivered') return { deliveredAt: now };
    if (status === 'cancelled') return { cancelledAt: now };
    return {};
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
      channel: order.channel as never,
      status: order.status,
      customerName: order.customerName,
      total: { amount: order.totalAmount, currency: order.currency as never },
      placedAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      ...this.statusTimestamps(order),
      etaMinutes: order.etaMinutes,
      items:
        payload.items?.map((item, index) => ({
          id: item.id ?? `${order.id}-${index}`,
          name: item.name,
          quantity: item.quantity,
          price: { amount: item.price, currency: order.currency as never },
          modifiers: item.modifiers
        })) ?? []
    };
  }
}
