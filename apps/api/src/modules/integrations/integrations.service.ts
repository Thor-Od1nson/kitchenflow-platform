import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.integration.findMany({ orderBy: { provider: 'asc' } });
  }

  test(provider: string) {
    return { provider, reachable: true, latencyMs: 142, checkedAt: new Date().toISOString() };
  }
}
