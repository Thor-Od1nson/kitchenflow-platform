import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import type { Channel, Money, Order, OrderStatus } from '@kitchenflow/types';
import { ObservabilityService } from '../../common/observability/observability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationsGateway } from '../../realtime/operations.gateway';
import { QueuesService } from '../queues/queues.service';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operations: OperationsGateway,
    private readonly queues: QueuesService,
    private readonly observability: ObservabilityService
  ) {}

  async ingest(provider: string, payload: Record<string, unknown>, signature?: string, idempotencyKey?: string, requestId?: string) {
    const normalizedProvider = provider.toLowerCase();
    const restaurantId = this.readString(payload.restaurantId);
    if (!restaurantId) throw new BadRequestException('restaurantId is required');

    const integration = await this.prisma.integration.findUnique({
      where: { restaurantId_provider: { restaurantId, provider: normalizedProvider } }
    });
    if (!integration?.webhookSecret) throw new UnauthorizedException('Webhook secret is not configured');

    const signedBody = JSON.stringify(payload);
    const signatureValid = this.verifySignature(signedBody, integration.webhookSecret, signature);
    const key = idempotencyKey ?? this.readString(payload.externalOrderId) ?? this.readString(payload.id) ?? signedBody;

    const event = await this.prisma.webhookEvent.upsert({
      where: { restaurantId_provider_idempotencyKey: { restaurantId, provider: normalizedProvider, idempotencyKey: key } },
      update: { status: 'duplicate', payload: payload as Prisma.InputJsonValue },
      create: {
        restaurantId,
        provider: normalizedProvider,
        eventType: this.readString(payload.type) ?? 'order.created',
        externalId: this.readString(payload.externalOrderId) ?? key,
        idempotencyKey: key,
        signatureValid,
        status: signatureValid ? 'received' : 'rejected',
        payload: payload as Prisma.InputJsonValue
      }
    });
    if (!signatureValid) {
      this.observability.recordWebhookFailure({ requestId, route: normalizedProvider, status: 'rejected' });
      throw new UnauthorizedException('Invalid webhook signature');
    }
    if (event.status === 'duplicate' || event.processedAt) return { ok: true, duplicate: true, eventId: event.id };

    try {
      const order = await this.processEvent(event.id, requestId);
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: 'processed', processedAt: new Date() }
      });
      await this.queues.enqueueOrderStatus(restaurantId, order.id, 'accepted', 10_000, requestId);
      await this.queues.enqueueNotification(restaurantId, `${order.publicId} ingested through ${normalizedProvider}`, 2_000, requestId);
      this.observability.info('webhook_processed', {
        module: 'webhooks',
        requestId,
        route: normalizedProvider,
        orderId: order.id
      });
      return { ok: true, eventId: event.id, order };
    } catch (error) {
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: 'failed', error: error instanceof Error ? error.message : 'Webhook processing failed' }
      });
      this.observability.recordWebhookFailure({
        requestId,
        route: normalizedProvider,
        errorMessage: error instanceof Error ? error.message : 'Webhook processing failed'
      });
      throw error;
    }
  }

  list(restaurantId: string, limit: number) {
    return this.prisma.webhookEvent.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  async retry(restaurantId: string, id: string, requestId?: string) {
    const event = await this.prisma.webhookEvent.findFirst({ where: { id, restaurantId } });
    if (!event) throw new BadRequestException('Webhook event not found');
    const history = this.history(event.replayHistory);
    try {
      const order = await this.processEvent(event.id, requestId);
      await this.prisma.webhookEvent.update({
        where: { id },
        data: {
          status: 'processed',
          error: null,
          processedAt: new Date(),
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
          replayHistory: [...history, { at: new Date().toISOString(), action: 'retry', status: 'processed' }] as Prisma.InputJsonValue
        }
      });
      this.observability.info('webhook_retry_processed', {
        module: 'webhooks',
        requestId,
        route: event.provider,
        orderId: order.id
      });
      return { ok: true, eventId: id, order };
    } catch (error) {
      await this.prisma.webhookEvent.update({
        where: { id },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Webhook retry failed',
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
          replayHistory: [...history, { at: new Date().toISOString(), action: 'retry', status: 'failed', detail: error instanceof Error ? error.message : 'Webhook retry failed' }] as Prisma.InputJsonValue
        }
      });
      this.observability.recordWebhookFailure({
        requestId,
        route: event.provider,
        errorMessage: error instanceof Error ? error.message : 'Webhook retry failed'
      });
      throw error;
    }
  }

  async replay(restaurantId: string, id: string, requestId?: string) {
    const event = await this.prisma.webhookEvent.findFirst({ where: { id, restaurantId } });
    if (!event) throw new BadRequestException('Webhook event not found');
    const replay = await this.prisma.webhookEvent.create({
      data: {
        restaurantId,
        provider: event.provider,
        eventType: event.eventType,
        externalId: `${event.externalId}:replay:${Date.now()}`,
        idempotencyKey: `${event.idempotencyKey}:replay:${Date.now()}`,
        signatureValid: event.signatureValid,
        status: 'received',
        replayOfId: event.id,
        payload: event.payload as Prisma.InputJsonValue
      }
    });
    const order = await this.processEvent(replay.id, requestId);
    await this.prisma.webhookEvent.update({
      where: { id: replay.id },
      data: { status: 'processed', processedAt: new Date() }
    });
    const history = this.history(event.replayHistory);
    await this.prisma.webhookEvent.update({
      where: { id },
      data: {
        replayCount: { increment: 1 },
        replayHistory: [...history, { at: new Date().toISOString(), action: 'replay', status: 'processed', detail: replay.id }] as Prisma.InputJsonValue
      }
    });
    this.observability.info('webhook_replay_processed', {
      module: 'webhooks',
      requestId,
      route: event.provider,
      orderId: order.id
    });
    return { ok: true, eventId: replay.id, replayOfId: id, order };
  }

  private async processEvent(eventId: string, requestId?: string) {
    const event = await this.prisma.webhookEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new BadRequestException('Webhook event not found');
    const payload = event.payload as Record<string, unknown>;
    return this.createOrderFromWebhook(event.restaurantId, event.provider as Channel, payload, requestId);
  }

  private history(value: unknown) {
    return Array.isArray(value) ? value : [];
  }

  private async createOrderFromWebhook(restaurantId: string, channel: Channel, payload: Record<string, unknown>, requestId?: string) {
    const outletId = this.readString(payload.outletId);
    if (!outletId) throw new BadRequestException('outletId is required');
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, restaurantId },
      select: { id: true, name: true, city: true }
    });
    if (!outlet) throw new BadRequestException('Outlet not found');

    const items = Array.isArray(payload.items) ? payload.items : [];
    const lines = items.map((item, index) => {
      const row = item as { id?: string; name?: string; quantity?: number; price?: number };
      return {
        id: row.id ?? `webhook-${Date.now()}-${index}`,
        name: row.name ?? 'Aggregator item',
        quantity: Number(row.quantity ?? 1),
        price: Number(row.price ?? 250)
      };
    });
    if (!lines.length) throw new BadRequestException('items are required');

    const totalAmount = Number(payload.totalAmount ?? lines.reduce((sum, item) => sum + item.price * item.quantity, 0));
    const created = await this.prisma.order.create({
      data: {
        publicId: this.createPublicId(outlet.city),
        restaurantId,
        outletId,
        channel,
        customerName: this.readString(payload.customerName) ?? 'Aggregator customer',
        totalAmount,
        currency: this.readString(payload.currency) ?? 'INR',
        etaMinutes: Number(payload.etaMinutes ?? 25),
        payload: { ...payload, source: 'webhook', items: lines } as Prisma.InputJsonValue
      },
      include: { outlet: { select: { name: true, city: true } } }
    });
    const order = this.serializeOrder(created);
    this.operations.emitOrderCreated({ restaurantId, order, requestId });
    await this.prisma.analyticsEvent.create({
      data: {
        restaurantId,
        type: 'webhook_order_created',
        dimensions: { provider: channel, outletId, outlet: outlet.name },
        metrics: { orderId: created.id, publicId: created.publicId, detail: `${channel} webhook order created` }
      }
    });
    return order;
  }

  private verifySignature(body: string, secret: string, signature?: string) {
    if (!signature) return false;
    const expected = createHmac('sha256', secret).update(body).digest('hex');
    const normalized = signature.replace(/^sha256=/, '');
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(normalized);
    return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  private readString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
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
