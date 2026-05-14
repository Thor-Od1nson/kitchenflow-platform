import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(restaurantId: string) {
    const [orders, events] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['status'],
        where: { restaurantId },
        _count: true,
        _sum: { totalAmount: true }
      }),
      this.prisma.analyticsEvent.findMany({
        where: { restaurantId },
        orderBy: { occurredAt: 'desc' },
        take: 100
      })
    ]);
    return { orders, events };
  }
}
