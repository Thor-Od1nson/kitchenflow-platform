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
