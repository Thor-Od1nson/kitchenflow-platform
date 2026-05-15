import { Injectable, Logger } from '@nestjs/common';

interface RequestMetric {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  correlationId?: string;
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

  recordRequest(metric: RequestMetric) {
    this.requestTotal += 1;
    this.requestDurationTotalMs += metric.durationMs;
    if (metric.statusCode >= 500) this.requestErrors += 1;
    this.logger.log(JSON.stringify({ type: 'http_request', ...metric }));
  }

  recordSocketConnected() {
    this.activeSocketConnections += 1;
    this.totalSocketConnections += 1;
  }

  recordSocketDisconnected() {
    this.activeSocketConnections = Math.max(0, this.activeSocketConnections - 1);
    this.totalSocketDisconnects += 1;
  }

  recordSocketRejected() {
    this.rejectedSocketConnections += 1;
  }

  recordSocketEmission() {
    this.emittedSocketEvents += 1;
  }

  snapshot() {
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
        rejectedConnections: this.rejectedSocketConnections
      }
    };
  }
}
