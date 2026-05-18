import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RealtimeModule } from '../../realtime/realtime.module';
import { QueuesModule } from '../queues/queues.module';
import { AggregatorController } from './aggregator.controller';
import { AggregatorService } from './aggregator.service';

@Module({
  imports: [PrismaModule, RealtimeModule, QueuesModule],
  controllers: [AggregatorController],
  providers: [AggregatorService],
  exports: [AggregatorService]
})
export class AggregatorModule {}
