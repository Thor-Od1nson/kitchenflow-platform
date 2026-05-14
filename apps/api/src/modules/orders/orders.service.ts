import { Injectable, NotFoundException } from '@nestjs/common';
import type { OrderStatus } from '@kitchenflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { ListOrdersDto } from './dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListOrdersDto) {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.query
        ? {
            OR: [
              { publicId: { contains: query.query, mode: 'insensitive' as const } },
              { customerName: { contains: query.query, mode: 'insensitive' as const } }
            ]
          }
        : {})
    };
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.order.count({ where })
    ]);
    return { items, page: query.page, limit: query.limit, total };
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    return this.prisma.order.update({ where: { id }, data: { status } });
  }
}
