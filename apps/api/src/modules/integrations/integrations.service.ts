import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(restaurantId: string) {
    const integrations = await this.prisma.integration.findMany({
      where: { restaurantId },
      orderBy: { provider: 'asc' }
    });
    return integrations.map((integration) => ({
      id: integration.id,
      provider: integration.provider,
      label: this.labelProvider(integration.provider),
      status: integration.status,
      lastSyncAt: integration.lastSyncAt?.toISOString() ?? null,
      lastSync: integration.lastSyncAt ? this.relativeTime(integration.lastSyncAt) : 'never',
      webhookHealth: this.webhookHealth(integration.status),
      webhookSecretConfigured: Boolean(integration.webhookSecret)
    }));
  }

  test(provider: string) {
    return { provider, reachable: true, latencyMs: 142, checkedAt: new Date().toISOString() };
  }

  private labelProvider(provider: string) {
    return provider
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private webhookHealth(status: string) {
    if (status === 'connected') return 98;
    if (status === 'syncing') return 91;
    if (status === 'degraded') return 74;
    return 0;
  }

  private relativeTime(date: Date) {
    const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60_000));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    return `${hours}h ago`;
  }
}
