import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MenusService {
  constructor(private readonly prisma: PrismaService) {}

  list(restaurantId: string) {
    return this.prisma.menuItem.findMany({
      where: { restaurantId },
      include: { outletScopes: { include: { outlet: { select: { id: true, name: true, city: true } } } } },
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });
  }

  updateAvailability(ids: string[], available: boolean) {
    return this.prisma.menuItem.updateMany({ where: { id: { in: ids } }, data: { available } });
  }
}
