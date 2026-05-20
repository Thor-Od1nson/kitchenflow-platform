import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ApiErrorResponse } from '@kitchenflow/types';
import type { RequestWithContext } from '../request-context';
import { ObservabilityService } from '../observability/observability.service';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly observability?: ObservabilityService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithContext>();
    const response = ctx.getResponse<{ status: (status: number) => { json: (body: ApiErrorResponse) => void } }>();
    const { status, code, message } = this.normalize(exception);
    const requestId = request.requestId ?? request.correlationId ?? 'unknown';
    const body: ApiErrorResponse = {
      success: false,
      code,
      message,
      requestId,
      correlationId: requestId
    };

    if (status >= 500) {
      this.observability?.error('unhandled_exception', {
        module: 'http',
        requestId,
        route: request.originalUrl,
        userId: request.user?.userId,
        role: request.user?.role,
        errorName: exception instanceof Error ? exception.name : 'UnknownError',
        errorMessage: exception instanceof Error ? exception.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'production' ? undefined : exception instanceof Error ? exception.stack : undefined
      });
    } else {
      this.observability?.warn('handled_exception', {
        module: 'http',
        requestId,
        route: request.originalUrl,
        status,
        code
      });
    }

    response.status(status).json(body);
  }

  private normalize(exception: unknown) {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return { status: HttpStatus.CONFLICT, code: 'CONFLICT', message: 'A matching record already exists.' };
      }
      if (exception.code === 'P2025') {
        return { status: HttpStatus.NOT_FOUND, code: 'NOT_FOUND', message: 'The requested record was not found.' };
      }
      return { status: HttpStatus.BAD_REQUEST, code: exception.code, message: 'Database request failed.' };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'object' && response && 'message' in response
          ? Array.isArray(response.message)
            ? response.message.join(', ')
            : String(response.message)
          : exception.message;
      return { status, code: this.codeFromStatus(status), message };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error.'
    };
  }

  private codeFromStatus(status: number) {
    if (status === 400) return 'BAD_REQUEST';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) return 'CONFLICT';
    if (status === 429) return 'RATE_LIMITED';
    return 'HTTP_ERROR';
  }
}
