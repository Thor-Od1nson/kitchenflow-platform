import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(restaurantId: string, outletId: string) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, restaurantId },
      select: { id: true, name: true, city: true }
    });
    if (!outlet) throw new NotFoundException('Outlet not found');

    const items = await this.prisma.inventoryItem.findMany({
      where: { outletId },
      orderBy: [{ quantity: 'asc' }, { name: 'asc' }]
    });

    return {
      outlet,
      items: items.map((item) => {
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
      })
    };
  }
}
