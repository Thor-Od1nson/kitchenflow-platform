import { Module } from '@nestjs/common';
import { OperationsGateway } from './operations.gateway';

@Module({ providers: [OperationsGateway] })
export class RealtimeModule {}
