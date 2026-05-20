'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi, type OrdersQuery } from '@/lib/dashboard-api';

export function useOrders(query: OrdersQuery) {
  return useQuery({
    queryKey: ['orders', query],
    queryFn: () => dashboardApi.orders(query)
  });
}

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ['analytics-summary'],
    queryFn: dashboardApi.analyticsSummary
  });
}

export function useActivity() {
  return useQuery({
    queryKey: ['activity'],
    queryFn: dashboardApi.activity
  });
}

export function usePayoutReconciliation() {
  return useQuery({
    queryKey: ['payout-reconciliation'],
    queryFn: dashboardApi.payoutReconciliation
  });
}

export function useWebhooks() {
  return useQuery({
    queryKey: ['webhooks'],
    queryFn: dashboardApi.webhooks
  });
}

export function useQueueActivity() {
  return useQuery({
    queryKey: ['queue-activity'],
    queryFn: dashboardApi.queueActivity
  });
}

export function useQueueMetrics() {
  return useQuery({
    queryKey: ['queue-metrics'],
    queryFn: dashboardApi.queueMetrics,
    refetchInterval: 10_000
  });
}

export function useDlq() {
  return useQuery({
    queryKey: ['queue-dlq'],
    queryFn: dashboardApi.dlq,
    refetchInterval: 10_000
  });
}

export function useSystemMetrics() {
  return useQuery({
    queryKey: ['system-metrics'],
    queryFn: dashboardApi.systemMetrics,
    refetchInterval: 10_000
  });
}

export function useControlCenter() {
  return useQuery({
    queryKey: ['control-center'],
    queryFn: dashboardApi.controlCenter,
    refetchInterval: 10_000
  });
}

export function useOperationalIntelligence() {
  return useQuery({
    queryKey: ['operational-intelligence'],
    queryFn: dashboardApi.operationalIntelligence
  });
}

export function useAudit(query: {
  page?: number;
  limit?: number;
  query?: string;
  action?: string;
  outletId?: string;
  entityType?: string;
  actorUserId?: string;
  actorRole?: string;
  severity?: string;
  operationType?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ['audit', query],
    queryFn: () => dashboardApi.audit(query)
  });
}

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: dashboardApi.integrations
  });
}

export function useInventory(outletId?: string) {
  return useQuery({
    queryKey: ['inventory', outletId ?? 'default'],
    queryFn: () => dashboardApi.inventory(outletId)
  });
}

export function useMenus() {
  return useQuery({
    queryKey: ['menus'],
    queryFn: dashboardApi.menus
  });
}
