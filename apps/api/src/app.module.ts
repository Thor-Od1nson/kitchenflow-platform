import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './common/audit/audit.module';
import { CorrelationMiddleware } from './common/middleware/correlation.middleware';
import { ObservabilityModule } from './common/observability/observability.module';
import { validateEnv } from './config/env';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AggregatorModule } from './modules/aggregator/aggregator.module';
import { AuditLogModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { MenusModule } from './modules/menus/menus.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { QueuesModule } from './modules/queues/queues.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ObservabilityModule,
    AuditModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    OrdersModule,
    QueuesModule,
    AggregatorModule,
    WebhooksModule,
    PayoutsModule,
    MenusModule,
    IntegrationsModule,
    InventoryModule,
    AnalyticsModule,
    AuditLogModule,
    RealtimeModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
