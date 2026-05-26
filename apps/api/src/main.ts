import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { ObservabilityService } from './common/observability/observability.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false
  });

  const config = app.get(ConfigService);
  const observability = app.get(ObservabilityService);

  const bodyLimit = config.get<string>('REQUEST_BODY_LIMIT') ?? '1mb';

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
    const allowed = [
      'http://localhost:3000',
      'http://localhost:3002',
      'https://kitchenflow-commerce.vercel.app'
    ];

    const configuredOrigins = (config.get<string>('CORS_ORIGIN') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const allAllowedOrigins = [...new Set([...allowed, ...configuredOrigins])];

    if (!origin || allAllowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    observability.warn('cors_origin_denied', {
      module: 'bootstrap',
      origin
    });

    return callback(new Error('CORS origin denied'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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