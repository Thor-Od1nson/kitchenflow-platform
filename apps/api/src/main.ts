import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { ObservabilityService } from './common/observability/observability.service';

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3002',
  'https://kitchenflow-commerce.vercel.app'
];
const CORS_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const CORS_ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'x-request-id', 'x-correlation-id', 'Accept', 'Origin', 'X-Requested-With'];

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '');
}

function parseConfiguredOrigins(value?: string) {
  return (value ?? '')
    .split(',')
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false
  });

  const config = app.get(ConfigService);
  const observability = app.get(ObservabilityService);

  const bodyLimit = config.get<string>('REQUEST_BODY_LIMIT') ?? '1mb';
  const allowedOrigins = [
    ...new Set([
      ...DEFAULT_CORS_ORIGINS.map(normalizeOrigin),
      ...parseConfiguredOrigins(config.get<string>('CORS_ORIGIN'))
    ])
  ];

  const isAllowedOrigin = (origin?: string) => {
    if (!origin) return true;
    return allowedOrigins.includes(normalizeOrigin(origin));
  };

  app.use((request, response, next) => {
    const origin = request.headers.origin;
    const requestHeaders = request.headers['access-control-request-headers'];
    const originValue = Array.isArray(origin) ? origin[0] : origin;
    const requestedHeaderValue = Array.isArray(requestHeaders) ? requestHeaders.join(', ') : requestHeaders;
    const isPreflight = request.method === 'OPTIONS';

    if (originValue && isAllowedOrigin(originValue)) {
      response.setHeader('Vary', 'Origin, Access-Control-Request-Headers');
      response.setHeader('Access-Control-Allow-Origin', originValue);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Access-Control-Allow-Methods', CORS_METHODS.join(','));
      response.setHeader('Access-Control-Allow-Headers', requestedHeaderValue || CORS_ALLOWED_HEADERS.join(','));
      response.setHeader('Access-Control-Expose-Headers', 'x-request-id,x-correlation-id');
    } else if (originValue) {
      observability.warn('cors_origin_denied', {
        module: 'bootstrap',
        origin: originValue,
        method: request.method,
        path: request.originalUrl
      });
    }

    if (isPreflight) {
      observability.info('cors_preflight', {
        module: 'bootstrap',
        origin: originValue ?? 'none',
        path: request.originalUrl,
        allowed: !originValue || isAllowedOrigin(originValue),
        requestedHeaders: requestedHeaderValue
      });

      response.statusCode = originValue && !isAllowedOrigin(originValue) ? 403 : 204;
      response.end();
      return;
    }

    next();
  });

  app.useBodyParser('json', { limit: bodyLimit });
  app.useBodyParser('urlencoded', {
    limit: bodyLimit,
    extended: true
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin'
      }
    })
  );

  app.useGlobalFilters(new ApiExceptionFilter(observability));

  app.enableCors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      observability.warn('cors_origin_denied', {
        module: 'bootstrap',
        origin
      });

      return callback(null, false);
    },
    credentials: true,
    methods: CORS_METHODS,
    allowedHeaders: CORS_ALLOWED_HEADERS,
    exposedHeaders: ['x-request-id', 'x-correlation-id'],
    optionsSuccessStatus: 204
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  app.setGlobalPrefix('v1', {
    exclude: [{ path: 'metrics', method: RequestMethod.GET }]
  });

  process.on('SIGTERM', () => {
    observability.info('shutdown_signal_received', {
      module: 'bootstrap',
      signal: 'SIGTERM'
    });

    void app.close().then(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    observability.info('shutdown_signal_received', {
      module: 'bootstrap',
      signal: 'SIGINT'
    });

    void app.close().then(() => process.exit(0));
  });

  const port = Number(process.env.PORT) || 4000;

  await app.listen(port, '0.0.0.0');

  observability.info('api_started', {
    module: 'bootstrap',
    port
  });
}

void bootstrap();
