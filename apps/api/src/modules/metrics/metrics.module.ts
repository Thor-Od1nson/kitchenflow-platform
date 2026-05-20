import { Module } from '@nestjs/common';
import { QueuesModule } from '../queues/queues.module';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [QueuesModule],
  controllers: [MetricsController]
})
export class MetricsModule {}
