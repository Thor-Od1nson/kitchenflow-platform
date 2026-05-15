import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { InventoryActivity, InventoryItem } from '@kitchenflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationsGateway } from '../../realtime/operations.gateway';
import { AdjustInventoryDto } from './dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operations: OperationsGateway
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
      outlet,
      items: items.map((item) => this.serializeItem(item)),
      activity: activity.map((item) => this.serializeActivity(item))
    };
  }

  async adjust(restaurantId: string, outletId: string, itemId: string, dto: AdjustInventoryDto) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, outletId, outlet: { restaurantId } }
    });
    if (!item) throw new NotFoundException('Inventory item not found');

    const nextQuantity = Number(item.quantity) + dto.delta;
    if (nextQuantity < 0) {
      throw new BadRequestException('Inventory quantity cannot go below zero');
    }

    const [updated, activity] = await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: nextQuantity }
      }),
      this.prisma.inventoryActivity.create({
        data: {
          outletId,
          sku: item.sku,
          name: item.name,
          delta: dto.delta,
          reason: dto.reason,
          quantityAfter: nextQuantity
        }
      })
    ]);

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
    this.operations.emitInventoryChanged({
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
      name: item.name,
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
      name: item.name,
      delta: Number(item.delta),
      reason: item.reason,
      quantityAfter: Number(item.quantityAfter),
      createdAt: item.createdAt.toISOString()
    };
  }
}
