import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Role } from '@kitchenflow/types';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditInput {
  restaurantId: string;
  actorUserId?: string;
  actorRole?: Role;
  action: string;
  entityType: string;
  entityId?: string;
  outletId?: string;
  outletName?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput) {
    await this.prisma.auditLog.create({
      data: {
        restaurantId: input.restaurantId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        outletId: input.outletId,
        outletName: input.outletName,
        metadata: (input.metadata ?? {}) as any,
        correlationId: input.correlationId
      }
    });
  }
}
