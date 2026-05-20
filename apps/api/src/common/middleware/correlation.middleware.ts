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
    const requestHeader = request.headers['x-request-id'];
    const correlationHeader = request.headers['x-correlation-id'];
    const incomingRequestId = Array.isArray(requestHeader) ? requestHeader[0] : requestHeader;
    const incomingCorrelationId = Array.isArray(correlationHeader) ? correlationHeader[0] : correlationHeader;
    request.requestId = incomingRequestId || incomingCorrelationId || randomUUID();
    request.correlationId = request.requestId;
    response.setHeader('x-request-id', request.requestId);
    response.setHeader('x-correlation-id', request.requestId);

    response.on('finish', () => {
      this.observability.recordRequest({
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
        requestId: request.requestId,
        userId: request.user?.userId,
        role: request.user?.role,
        route: request.route?.path
      });
    });

    next();
  }
}
