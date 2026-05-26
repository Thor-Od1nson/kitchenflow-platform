import { Injectable } from '@nestjs/common';
import { normalizeOutletName, normalizeProvider, normalizePublicId } from '../../common/operational-normalization';
import { PrismaService } from '../../prisma/prisma.service';

const commissionByChannel: Record<string, number> = {
  deliveroo: 0.23,
  talabat: 0.2,
  careem: 0.22,
  noon_food: 0.21,
  hungerstation: 0.2,
  jahez: 0.19,
  uber_eats: 0.24,
  business_central: 0.02,
  pos: 0.03,
  direct: 0.04
};

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async reconcile(restaurantId: string) {
    const delivered = await this.prisma.order.findMany({
      where: { restaurantId, status: 'delivered' },
      include: { outlet: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 200
    });
    let created = 0;
    let updated = 0;
    for (const order of delivered) {
      const channel = normalizeProvider(order.channel);
      const publicId = normalizePublicId(order.publicId, order.outlet.name);
      const commission = commissionByChannel[channel] ?? 0.18;
      const expectedPayout = Math.round(order.totalAmount * (1 - commission));
      const settlementDueAt = new Date(order.updatedAt.getTime() + this.settlementDelayDays(channel) * 24 * 60 * 60 * 1000);
      const shouldSettle = settlementDueAt.getTime() <= Date.now();
      const actualPayout = shouldSettle ? expectedPayout + this.deterministicVariance(publicId) : null;
      const varianceAmount = actualPayout === null ? 0 : actualPayout - expectedPayout;
      const status = !shouldSettle ? 'pending' : Math.abs(varianceAmount) > 25 ? 'variance' : 'matched';
      const row = await this.prisma.payoutLedger.upsert({
        where: { restaurantId_publicId_channel: { restaurantId, publicId, channel } },
        update: {
          expectedPayout,
          actualPayout,
          varianceAmount,
          status,
          settlementDueAt,
          settledAt: shouldSettle ? new Date() : null
        },
        create: {
          restaurantId,
          orderId: order.id,
          publicId,
          outletId: order.outletId,
          outletName: normalizeOutletName(order.outlet.name),
          channel,
          grossAmount: order.totalAmount,
          expectedPayout,
          actualPayout,
          varianceAmount,
          status,
          settlementDueAt,
          settledAt: shouldSettle ? new Date() : null
        }
      });
      if (row.createdAt.getTime() === row.updatedAt.getTime()) created += 1;
      else updated += 1;
    }
    return { scanned: delivered.length, created, updated };
  }

  async summary(restaurantId: string) {
    await this.reconcile(restaurantId);
    const rows = await this.prisma.payoutLedger.findMany({
      where: { restaurantId },
      orderBy: [{ status: 'desc' }, { settlementDueAt: 'desc' }],
      take: 80
    });
    const totals = rows.reduce(
      (sum, row) => ({
        gross: sum.gross + row.grossAmount,
        expected: sum.expected + row.expectedPayout,
        actual: sum.actual + (row.actualPayout ?? 0),
        variance: sum.variance + row.varianceAmount,
        pending: sum.pending + (row.status === 'pending' ? 1 : 0),
        variances: sum.variances + (row.status === 'variance' ? 1 : 0)
      }),
      { gross: 0, expected: 0, actual: 0, variance: 0, pending: 0, variances: 0 }
    );
    return {
      generatedAt: new Date().toISOString(),
      totals,
      rows: rows.map((row) => ({
        ...row,
        publicId: normalizePublicId(row.publicId, row.outletName ?? ''),
        outletName: row.outletName ? normalizeOutletName(row.outletName) : row.outletName,
        channel: normalizeProvider(row.channel)
      }))
    };
  }

  private settlementDelayDays(channel: string) {
    if (channel === 'direct') return 1;
    if (channel === 'uber_eats') return 4;
    return 3;
  }

  private deterministicVariance(seed: string) {
    const value = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    if (value % 7 === 0) return -Math.min(95, 20 + (value % 90));
    if (value % 11 === 0) return Math.min(75, 15 + (value % 70));
    return 0;
  }
}
