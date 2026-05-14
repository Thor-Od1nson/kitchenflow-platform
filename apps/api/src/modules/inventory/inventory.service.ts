import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  list(outletId: string) {
    return this.prisma.inventoryItem.findMany({ where: { outletId }, orderBy: { name: 'asc' } });
  }
}
