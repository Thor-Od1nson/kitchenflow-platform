import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OperationsGateway } from './operations.gateway';

@Module({ imports: [JwtModule.register({})], providers: [OperationsGateway], exports: [OperationsGateway] })
export class RealtimeModule {}
