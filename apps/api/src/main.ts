import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { ObservabilityService } from './common/observability/observability.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  const observability = app.get(ObservabilityService);

  const bodyLimit = config.get<string>('REQUEST_BODY_LIMIT') ?? '1mb';
  app.useBodyParser('json', { limit: bodyLimit });
  app.useBodyParser('urlencoded', { limit: bodyLimit, extended: true });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.useGlobalFilters(new ApiExceptionFilter(observability));
  app.enableCors({
    origin: (origin, callback) => {
      const allowed = (config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      if (!origin || allowed.includes(origin)) return callback(null, true);
      return callback(new Error('CORS origin denied'), false);
    },
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );
  app.setGlobalPrefix('v1', { exclude: [{ path: 'metrics', method: RequestMethod.GET }] });

  process.on('SIGTERM', () => {
    observability.info('shutdown_signal_received', { module: 'bootstrap', signal: 'SIGTERM' });
    void app.close().then(() => process.exit(0));
  });
  process.on('SIGINT', () => {
    observability.info('shutdown_signal_received', { module: 'bootstrap', signal: 'SIGINT' });
    void app.close().then(() => process.exit(0));
  });

  await app.listen(process.env.PORT ?? 4000);
  observability.info('api_started', { module: 'bootstrap', port: process.env.PORT ?? 4000 });
}

void bootstrap();
