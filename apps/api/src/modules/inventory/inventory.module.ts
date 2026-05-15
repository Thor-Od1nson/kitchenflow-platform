import { Module } from '@nestjs/common';
import { RealtimeModule } from '../../realtime/realtime.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({ imports: [RealtimeModule], controllers: [InventoryController], providers: [InventoryService] })
export class InventoryModule {}
