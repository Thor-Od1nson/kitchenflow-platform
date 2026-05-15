import { randomUUID } from 'crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { RequestWithContext } from '../request-context';
import { ObservabilityService } from '../observability/observability.service';

type ResponseLike = {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  on: (event: 'finish', listener: () => void) => void;
};

type NextFunction = () => void;

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  constructor(private readonly observability: ObservabilityService) {}

  use(request: RequestWithContext, response: ResponseLike, next: NextFunction) {
    const startedAt = Date.now();
    const incoming = request.headers['x-correlation-id'];
    const correlationId = Array.isArray(incoming) ? incoming[0] : incoming;
    request.correlationId = correlationId || randomUUID();
    response.setHeader('x-correlation-id', request.correlationId);

    response.on('finish', () => {
      this.observability.recordRequest({
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
        correlationId: request.correlationId
      });
    });

    next();
  }
}
