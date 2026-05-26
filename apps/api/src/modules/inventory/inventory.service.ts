import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { InventoryActivity, InventoryItem } from '@kitchenflow/types';
import { AuditService } from '../../common/audit/audit.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { normalizeCity, normalizeOperationalText, normalizeOutletName } from '../../common/operational-normalization';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationsGateway } from '../../realtime/operations.gateway';
import { AdjustInventoryDto } from './dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operations: OperationsGateway,
    private readonly audit: AuditService
  ) {}

  async listDefault(restaurantId: string) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
    return this.list(restaurantId, outlet.id);
  }

  async list(restaurantId: string, outletId: string) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, restaurantId },
      select: { id: true, name: true, city: true }
    });
    if (!outlet) throw new NotFoundException('Outlet not found');

    const [items, activity] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: { outletId },
        orderBy: [{ quantity: 'asc' }, { name: 'asc' }]
      }),
      this.prisma.inventoryActivity.findMany({
        where: { outletId },
        orderBy: { createdAt: 'desc' },
        take: 12
      })
    ]);

    return {
      outlet: { ...outlet, name: normalizeOutletName(outlet.name), city: normalizeCity(outlet.city) },
      items: items.map((item) => this.serializeItem(item)),
      activity: activity.map((item) => this.serializeActivity(item))
    };
  }

  async adjust(user: AuthenticatedUser, outletId: string, itemId: string, dto: AdjustInventoryDto, correlationId?: string) {
    const restaurantId = user.restaurantId;
    const { updated, activity, outletName } = await this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findFirst({
        where: { id: itemId, outletId, outlet: { restaurantId } },
        include: { outlet: { select: { name: true } } }
      });
      if (!item) throw new NotFoundException('Inventory item not found');

      if (Number(item.quantity) + dto.delta < 0) {
        throw new BadRequestException('Inventory quantity cannot go below zero');
      }

      const updatedCount = await tx.inventoryItem.updateMany({
        where: {
          id: item.id,
          ...(dto.delta < 0 ? { quantity: { gte: Math.abs(dto.delta) } } : {})
        },
        data: { quantity: { increment: dto.delta } }
      });
      if (updatedCount.count !== 1) {
        throw new BadRequestException('Inventory quantity cannot go below zero');
      }
      const updatedItem = await tx.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
      const nextQuantity = Number(updatedItem.quantity);
      const createdActivity = await tx.inventoryActivity.create({
        data: {
          outletId,
          sku: item.sku,
          name: item.name,
          delta: dto.delta,
          reason: dto.reason,
          quantityAfter: nextQuantity
        }
      });

      return { updated: updatedItem, activity: createdActivity, outletName: item.outlet.name };
    });

    const serialized = this.serializeItem(updated);
    const serializedActivity = this.serializeActivity(activity);
    await this.prisma.analyticsEvent.create({
      data: {
        restaurantId,
        type: serialized.risk === 'critical' ? 'inventory_warning' : 'inventory_adjusted',
        dimensions: { outletId, sku: updated.sku },
        metrics: {
          itemId: updated.id,
          delta: dto.delta,
          quantityAfter: serialized.quantity,
          detail: `${updated.name} adjusted by ${dto.delta} ${updated.unit}; now ${serialized.quantity}`
        }
      }
    });
    await this.audit.record({
      restaurantId,
      actorUserId: user.userId,
      actorRole: user.role,
      action: serialized.risk === 'critical' ? 'inventory.low_stock' : 'inventory.adjusted',
      entityType: 'inventory_item',
      entityId: updated.id,
      outletId,
      outletName,
      metadata: {
        sku: updated.sku,
        name: updated.name,
        delta: dto.delta,
        quantityAfter: serialized.quantity,
        reason: dto.reason
      },
      correlationId
    });
    this.operations.emitInventoryChanged({
      requestId: correlationId,
      restaurantId,
      outletId,
      sku: updated.sku,
      quantity: serialized.quantity,
      item: serialized,
      activity: serializedActivity
    });

    return { item: serialized, activity: serializedActivity };
  }

  private serializeItem(item: {
    id: string;
    outletId: string;
    sku: string;
    name: string;
    unit: string;
    quantity: unknown;
    reorderAt: unknown;
    updatedAt: Date;
  }): InventoryItem {
    const quantity = Number(item.quantity);
    const reorderAt = Number(item.reorderAt);
    return {
      id: item.id,
      outletId: item.outletId,
      sku: item.sku,
      name: normalizeOperationalText(item.name),
      unit: item.unit,
      quantity,
      reorderAt,
      stockPercent: Math.min(100, Math.round((quantity / Math.max(reorderAt * 2, 1)) * 100)),
      risk: quantity <= reorderAt ? 'critical' : quantity <= reorderAt * 1.4 ? 'warning' : 'healthy',
      updatedAt: item.updatedAt.toISOString()
    };
  }

  private serializeActivity(item: {
    id: string;
    outletId: string;
    sku: string;
    name: string;
    delta: unknown;
    reason: string;
    quantityAfter: unknown;
    createdAt: Date;
  }): InventoryActivity {
    return {
      id: item.id,
      outletId: item.outletId,
      sku: item.sku,
      name: normalizeOperationalText(item.name),
      delta: Number(item.delta),
      reason: item.reason,
      quantityAfter: Number(item.quantityAfter),
      createdAt: item.createdAt.toISOString()
    };
  }
}
