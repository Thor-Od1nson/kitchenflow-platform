import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { RealtimeModule } from '../../realtime/realtime.module';
import { QueuesService } from './queues.service';
import { QueuesController } from './queues.controller';

@Module({
  imports: [ConfigModule, PrismaModule, forwardRef(() => RealtimeModule)],
  controllers: [QueuesController],
  providers: [QueuesService],
  exports: [QueuesService]
})
export class QueuesModule {}
