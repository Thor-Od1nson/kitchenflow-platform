import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import { Prisma } from '@prisma/client';
import type { OrderStatus } from '@kitchenflow/types';
import { ObservabilityService } from '../../common/observability/observability.service';
import { normalizeCity, normalizeCurrency, normalizeCustomerName, normalizeOperationalText, normalizeOutletName, normalizeProvider, normalizePublicId } from '../../common/operational-normalization';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationsGateway } from '../../realtime/operations.gateway';

type QueuePayload =
  (
    | { type: 'order-status'; restaurantId: string; orderId: string; status: OrderStatus }
    | { type: 'sla-scan'; restaurantId?: string }
    | { type: 'notification'; restaurantId: string; detail: string }
    | { type: 'order-aging'; restaurantId?: string }
    | { type: 'test-failure'; restaurantId: string }
  ) & { requestId?: string; dlqRetryCount?: number };

interface DlqPayload {
  originalQueue: string;
  originalJobId?: string;
  jobName: string;
  data: QueuePayload;
  failedReason: string;
  attemptsMade: number;
  movedAt: string;
  requestId?: string;
  dlqRetryCount: number;
}

const terminalStatuses = ['delivered', 'cancelled'];

@Injectable()
export class QueuesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueuesService.name);
  private queue?: Queue<QueuePayload>;
  private dlqQueue?: Queue<DlqPayload>;
  private worker?: Worker<QueuePayload>;
  private heartbeat?: NodeJS.Timeout;
  private workerHeartbeatAt: Date | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly operations: OperationsGateway,
    private readonly observability: ObservabilityService
  ) {}

  onModuleInit() {
    const connection = this.redisConnection();
    if (!connection) {
      this.logger.warn('REDIS_URL is not configured. Queue jobs will be recorded but not processed.');
      return;
    }

    this.queue = new Queue<QueuePayload>('kitchenflow-ops', { connection });
    this.dlqQueue = new Queue<DlqPayload>('kitchenflow-ops-dlq', { connection });
    this.worker = new Worker<QueuePayload>('kitchenflow-ops', (job) => this.process(job), {
      connection,
      concurrency: 4
    });
    this.workerHeartbeatAt = new Date();
    this.heartbeat = setInterval(() => {
      this.workerHeartbeatAt = new Date();
    }, 10_000);
    this.worker.on('active', () => this.observability.recordQueueActive(1));
    this.worker.on('completed', (job) => {
      this.observability.recordQueueActive(-1);
      this.observability.info('queue_job_completed', {
        module: 'queues',
        requestId: job.data.requestId,
        jobId: job.id,
        route: job.name
      });
    });
    this.worker.on('failed', (job, error) => {
      this.observability.recordQueueActive(-1);
      this.observability.recordQueueFailed({
        requestId: job?.data.requestId,
        jobId: job?.id,
        route: job?.name,
        errorMessage: error.message
      });
      void this.recordActivity({
        restaurantId: job?.data && 'restaurantId' in job.data ? job.data.restaurantId : undefined,
        queue: 'kitchenflow-ops',
        jobName: job?.name ?? 'unknown',
        jobId: job?.id,
        status: 'failed',
        detail: error.message,
        payload: { ...(job?.data ?? {}), attemptsMade: job?.attemptsMade ?? 0 }
      });
      if (job && job.attemptsMade >= Number(job.opts.attempts ?? 1)) {
        void this.moveToDlq(job, error);
      }
    });
  }

  async onModuleDestroy() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    await this.worker?.close();
    await this.queue?.close();
    await this.dlqQueue?.close();
  }

  async enqueueOrderStatus(restaurantId: string, orderId: string, status: OrderStatus, delayMs: number, requestId?: string) {
    return this.enqueue('order-status', { type: 'order-status', restaurantId, orderId, status, requestId }, delayMs, 3);
  }

  async enqueueSlaScan(restaurantId?: string, delayMs = 60_000, requestId?: string) {
    return this.enqueue('sla-scan', { type: 'sla-scan', restaurantId, requestId }, delayMs, 2);
  }

  async enqueueNotification(restaurantId: string, detail: string, delayMs: number, requestId?: string) {
    return this.enqueue('notification', { type: 'notification', restaurantId, detail, requestId }, delayMs, 3);
  }

  async enqueueOrderAging(restaurantId?: string, delayMs = 120_000, requestId?: string) {
    return this.enqueue('order-aging', { type: 'order-aging', restaurantId, requestId }, delayMs, 2);
  }

  async enqueueTestFailure(restaurantId: string, requestId?: string) {
    return this.enqueue('test-failure', { type: 'test-failure', restaurantId, requestId }, 0, 2);
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
    const dlqCounts = this.dlqQueue ? await this.dlqQueue.getJobCounts('waiting', 'delayed') : { waiting: 0, delayed: 0 };
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
      averageProcessingMs: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
      dlqCount: (dlqCounts.waiting ?? 0) + (dlqCounts.delayed ?? 0)
    };
  }

  async dlq() {
    if (!this.dlqQueue) return [];
    const jobs = await this.dlqQueue.getJobs(['waiting', 'delayed'], 0, 100, false);
    return jobs.map((job) => ({
      id: job.id,
      originalJobId: job.data.originalJobId,
      jobName: job.data.jobName,
      queue: job.data.originalQueue,
      failedReason: job.data.failedReason,
      attemptsMade: job.data.attemptsMade,
      dlqRetryCount: job.data.dlqRetryCount,
      requestId: job.data.requestId,
      movedAt: job.data.movedAt,
      payload: job.data.data
    }));
  }

  async retryDlqJob(id: string, requestId?: string) {
    if (!this.queue || !this.dlqQueue) {
      throw new BadRequestException('Redis queue unavailable');
    }
    const dlqJob = await this.dlqQueue.getJob(id);
    if (!dlqJob) {
      throw new NotFoundException('DLQ job not found');
    }
    if (dlqJob.data.dlqRetryCount >= 3) {
      this.observability.warn('dlq_poison_job_blocked', {
        module: 'queues',
        requestId,
        jobId: id,
        route: dlqJob.data.jobName
      });
      throw new BadRequestException('Poison job retry limit reached');
    }
    const retryPayload = {
      ...dlqJob.data.data,
      requestId: requestId ?? dlqJob.data.requestId,
      dlqRetryCount: dlqJob.data.dlqRetryCount + 1
    } as QueuePayload;
    const retry = await this.enqueue(dlqJob.data.jobName, retryPayload, 0, 2);
    await dlqJob.remove();
    this.observability.recordQueueRetry({
      requestId: retryPayload.requestId,
      jobId: retry?.id,
      route: dlqJob.data.jobName,
      originalJobId: dlqJob.data.originalJobId
    });
    return { ok: true, retriedJobId: retry?.id ?? null };
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
    this.observability.info('queue_job_queued', {
      module: 'queues',
      requestId: payload.requestId,
      jobId: job.id,
      route: name,
      orderId: payload.type === 'order-status' ? payload.orderId : undefined
    });
    return job;
  }

  private async process(job: Job<QueuePayload>) {
    const payload = job.data;
    const startedAt = Date.now();
    this.workerHeartbeatAt = new Date();
    this.observability.info('queue_job_started', {
      module: 'queues',
      requestId: payload.requestId,
      jobId: job.id,
      route: job.name,
      orderId: payload.type === 'order-status' ? payload.orderId : undefined
    });
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
      requestId: job.data.requestId,
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
        payload: input.payload as any
      }
    });
  }

  private async moveToDlq(job: Job<QueuePayload>, error: Error) {
    if (!this.dlqQueue) return;
    const retryCount = job.data.dlqRetryCount ?? 0;
    const dlqJob = await this.dlqQueue.add(
      'dead-letter',
      {
        originalQueue: job.queueName,
        originalJobId: job.id,
        jobName: job.name,
        data: job.data,
        failedReason: error.message,
        attemptsMade: job.attemptsMade,
        movedAt: new Date().toISOString(),
        requestId: job.data.requestId,
        dlqRetryCount: retryCount
      },
      { jobId: `dlq-${job.id}`, removeOnComplete: false, removeOnFail: false }
    );
    this.observability.recordDlqMoved({
      requestId: job.data.requestId,
      jobId: job.id,
      dlqJobId: dlqJob.id,
      route: job.name,
      orderId: job.data.type === 'order-status' ? job.data.orderId : undefined
    });
    await this.recordActivity({
      restaurantId: 'restaurantId' in job.data ? job.data.restaurantId : undefined,
      queue: job.queueName,
      jobName: job.name,
      jobId: job.id,
      status: 'dlq',
      detail: error.message,
      payload: { ...job.data, attemptsMade: job.attemptsMade, dlqJobId: dlqJob.id }
    });
    try {
      await job.remove();
    } catch {
      this.observability.debug('queue_failed_job_retained_after_dlq_copy', {
        module: 'queues',
        requestId: job.data.requestId,
        jobId: job.id
      });
    }
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
    const currency = normalizeCurrency(order.currency);
    const outletName = normalizeOutletName(order.outlet.name);
    const outletCity = normalizeCity(order.outlet.city);
    return {
      id: order.id,
      publicId: normalizePublicId(order.publicId, outletCity || outletName),
      restaurantId: order.restaurantId,
      outletId: order.outletId,
      outletName,
      outletCity,
      channel: normalizeProvider(order.channel) as never,
      status: order.status,
      customerName: normalizeCustomerName(order.customerName),
      total: { amount: order.totalAmount, currency: currency as never },
      placedAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      ...this.statusTimestamps(order),
      etaMinutes: order.etaMinutes,
      items:
        payload.items?.map((item, index) => ({
          id: item.id ?? `${order.id}-${index}`,
          name: normalizeOperationalText(item.name),
          quantity: item.quantity,
          price: { amount: item.price, currency: currency as never },
          modifiers: item.modifiers
        })) ?? []
    };
  }
}
