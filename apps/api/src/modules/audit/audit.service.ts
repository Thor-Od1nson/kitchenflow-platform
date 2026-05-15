import { Injectable } from '@nestjs/common';
import type { AuditLogResponse } from '@kitchenflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { ListAuditDto } from './dto';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(restaurantId: string, query: ListAuditDto): Promise<AuditLogResponse> {
    const where = {
      restaurantId,
      ...(query.action ? { action: query.action } : {}),
      ...(query.outletId ? { outletId: query.outletId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.query
        ? {
            OR: [
              { action: { contains: query.query, mode: 'insensitive' as const } },
              { entityType: { contains: query.query, mode: 'insensitive' as const } },
              { entityId: { contains: query.query, mode: 'insensitive' as const } },
              { outletName: { contains: query.query, mode: 'insensitive' as const } }
            ]
          }
        : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        metadata: item.metadata as Record<string, unknown>,
        createdAt: item.createdAt.toISOString()
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit))
    };
  }
}
