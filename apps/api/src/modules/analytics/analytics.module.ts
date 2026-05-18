import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../common/observability/observability.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({ imports: [ObservabilityModule], controllers: [AnalyticsController], providers: [AnalyticsService] })
export class AnalyticsModule {}
