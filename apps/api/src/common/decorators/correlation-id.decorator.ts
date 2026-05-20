import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithContext } from '../request-context';

export const CorrelationId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | undefined => {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    return request.requestId ?? request.correlationId;
  }
);
