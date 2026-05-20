import { Injectable, Logger } from '@nestjs/common';
import type { Role } from '@kitchenflow/types';

interface RequestMetric {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  requestId?: string;
  userId?: string;
  role?: Role;
  route?: string;
}

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger('KitchenFlow');
  private requestTotal = 0;
  private requestErrors = 0;
  private requestDurationTotalMs = 0;
  private activeSocketConnections = 0;
  private totalSocketConnections = 0;
  private totalSocketDisconnects = 0;
  private emittedSocketEvents = 0;
  private rejectedSocketConnections = 0;
  private queueActive = 0;
  private queueFailed = 0;
  private queueRetryCount = 0;
  private dlqJobs = 0;
  private webhookFailures = 0;
  private authRefreshCount = 0;
  private realtimeWindowStartedAt = Date.now();
  private realtimeWindowEvents = 0;

  debug(message: string, metadata: Record<string, unknown> = {}) {
    this.write('debug', message, metadata);
  }

  info(message: string, metadata: Record<string, unknown> = {}) {
    this.write('info', message, metadata);
  }

  warn(message: string, metadata: Record<string, unknown> = {}) {
    this.write('warn', message, metadata);
  }

  error(message: string, metadata: Record<string, unknown> = {}) {
    this.write('error', message, metadata);
  }

  recordRequest(metric: RequestMetric) {
    this.requestTotal += 1;
    this.requestDurationTotalMs += metric.durationMs;
    if (metric.statusCode >= 500) this.requestErrors += 1;
    this.info('http_request', {
      module: 'http',
      route: metric.route ?? metric.path,
      ...metric
    });
  }

  recordSocketConnected(metadata: Record<string, unknown> = {}) {
    this.activeSocketConnections += 1;
    this.totalSocketConnections += 1;
    this.info('websocket_connected', { module: 'realtime', ...metadata });
  }

  recordSocketDisconnected(metadata: Record<string, unknown> = {}) {
    this.activeSocketConnections = Math.max(0, this.activeSocketConnections - 1);
    this.totalSocketDisconnects += 1;
    this.info('websocket_disconnected', { module: 'realtime', ...metadata });
  }

  recordSocketRejected(metadata: Record<string, unknown> = {}) {
    this.rejectedSocketConnections += 1;
    this.warn('websocket_rejected', { module: 'realtime', ...metadata });
  }

  recordSocketEmission(metadata: Record<string, unknown> = {}) {
    this.emittedSocketEvents += 1;
    this.realtimeWindowEvents += 1;
    this.debug('websocket_event_emitted', { module: 'realtime', ...metadata });
  }

  recordQueueActive(delta: number) {
    this.queueActive = Math.max(0, this.queueActive + delta);
  }

  recordQueueFailed(metadata: Record<string, unknown> = {}) {
    this.queueFailed += 1;
    this.warn('queue_job_failed', { module: 'queues', ...metadata });
  }

  recordQueueRetry(metadata: Record<string, unknown> = {}) {
    this.queueRetryCount += 1;
    this.info('queue_job_retry', { module: 'queues', ...metadata });
  }

  recordDlqMoved(metadata: Record<string, unknown> = {}) {
    this.dlqJobs += 1;
    this.error('queue_job_moved_to_dlq', { module: 'queues', ...metadata });
  }

  recordWebhookFailure(metadata: Record<string, unknown> = {}) {
    this.webhookFailures += 1;
    this.warn('webhook_failure', { module: 'webhooks', ...metadata });
  }

  recordAuthRefresh(metadata: Record<string, unknown> = {}) {
    this.authRefreshCount += 1;
    this.info('auth_refresh', { module: 'auth', ...metadata });
  }

  snapshot() {
    const now = Date.now();
    const elapsedSeconds = Math.max(1, (now - this.realtimeWindowStartedAt) / 1000);
    const eventsPerSecond = Number((this.realtimeWindowEvents / elapsedSeconds).toFixed(2));
    if (elapsedSeconds > 60) {
      this.realtimeWindowStartedAt = now;
      this.realtimeWindowEvents = 0;
    }

    return {
      requests: {
        total: this.requestTotal,
        errors: this.requestErrors,
        averageMs: this.requestTotal ? Math.round(this.requestDurationTotalMs / this.requestTotal) : 0
      },
      websocket: {
        activeConnections: this.activeSocketConnections,
        totalConnections: this.totalSocketConnections,
        totalDisconnects: this.totalSocketDisconnects,
        emittedEvents: this.emittedSocketEvents,
        rejectedConnections: this.rejectedSocketConnections,
        eventsPerSecond
      },
      queues: {
        active: this.queueActive,
        failed: this.queueFailed,
        retryCount: this.queueRetryCount,
        dlqJobs: this.dlqJobs
      },
      webhooks: {
        failures: this.webhookFailures
      },
      auth: {
        refreshCount: this.authRefreshCount
      }
    };
  }

  private write(level: 'debug' | 'info' | 'warn' | 'error', message: string, metadata: Record<string, unknown>) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'kitchenflow-api',
      ...metadata
    };
    const line = JSON.stringify(entry);
    if (level === 'error') {
      this.logger.error(line);
    } else if (level === 'warn') {
      this.logger.warn(line);
    } else if (level === 'debug') {
      this.logger.debug(line);
    } else {
      this.logger.log(line);
    }
  }
}
