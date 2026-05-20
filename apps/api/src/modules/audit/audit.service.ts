import { Injectable } from '@nestjs/common';
import type { AuditLogResponse } from '@kitchenflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { ListAuditDto } from './dto';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(restaurantId: string, query: ListAuditDto): Promise<AuditLogResponse> {
    const createdAt =
      query.dateFrom || query.dateTo
        ? {
            ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: new Date(query.dateTo) } : {})
          }
        : undefined;
    const severityActions = query.severity ? this.actionsForSeverity(query.severity) : undefined;
    const actionFilters = [
      ...(query.action ? [{ action: query.action }] : []),
      ...(!query.action && severityActions?.length ? [{ action: { in: severityActions } }] : []),
      ...(query.operationType ? [{ action: { contains: query.operationType, mode: 'insensitive' as const } }] : [])
    ];
    const where = {
      restaurantId,
      ...(actionFilters.length ? { AND: actionFilters } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.actorRole ? { actorRole: query.actorRole as never } : {}),
      ...(query.outletId ? { outletId: query.outletId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(query.query
        ? {
            OR: [
              { action: { contains: query.query, mode: 'insensitive' as const } },
              { entityType: { contains: query.query, mode: 'insensitive' as const } },
              { entityId: { contains: query.query, mode: 'insensitive' as const } },
              { outletName: { contains: query.query, mode: 'insensitive' as const } },
              { actorUserId: { contains: query.query, mode: 'insensitive' as const } }
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
        severity: this.severityForAction(item.action),
        createdAt: item.createdAt.toISOString()
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit))
    };
  }

  private severityForAction(action: string) {
    if (action === 'auth.failed' || action === 'inventory.low_stock') return 'warning';
    return 'info';
  }

  private actionsForSeverity(severity: string) {
    if (severity === 'warning') return ['auth.failed', 'inventory.low_stock'];
    if (severity === 'info') return ['auth.login', 'auth.logout', 'order.created', 'order.status_changed', 'inventory.adjusted'];
    if (severity === 'error' || severity === 'critical') return ['__none__'];
    return undefined;
  }
}
