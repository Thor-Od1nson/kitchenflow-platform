'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi, type OrdersQuery } from '@/lib/dashboard-api';

export function useOrders(query: OrdersQuery) {
  return useQuery({
    queryKey: ['orders', query],
    queryFn: () => dashboardApi.orders(query),
    refetchInterval: 15_000
  });
}

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ['analytics-summary'],
    queryFn: dashboardApi.analyticsSummary,
    refetchInterval: 30_000
  });
}

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: dashboardApi.integrations,
    refetchInterval: 30_000
  });
}

export function useInventory(outletId?: string) {
  return useQuery({
    queryKey: ['inventory', outletId],
    queryFn: () => dashboardApi.inventory(outletId!),
    enabled: Boolean(outletId),
    refetchInterval: 20_000
  });
}

export function useMenus() {
  return useQuery({
    queryKey: ['menus'],
    queryFn: dashboardApi.menus,
    refetchInterval: 60_000
  });
}
