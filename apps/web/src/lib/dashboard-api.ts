'use client';

import type {
  AnalyticsSummary,
  Channel,
  DashboardIntegration,
  InventoryResponse,
  MenuItem,
  Order,
  OrderStatus,
  PaginatedResponse
} from '@kitchenflow/types';
import { apiClient } from './api-client';

export interface OrdersQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus | 'all';
  channel?: Channel | 'all';
  outletId?: string;
  dateFrom?: string;
  dateTo?: string;
  query?: string;
}

function cleanParams(query: OrdersQuery) {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== '' && value !== 'all')
  );
}

export const dashboardApi = {
  async orders(query: OrdersQuery = {}) {
    const response = await apiClient.get<PaginatedResponse<Order>>('/orders', { params: cleanParams(query) });
    return response.data;
  },
  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const response = await apiClient.patch<Order>(`/orders/${orderId}/status`, { status });
    return response.data;
  },
  async analyticsSummary() {
    const response = await apiClient.get<AnalyticsSummary>('/analytics/summary');
    return response.data;
  },
  async integrations() {
    const response = await apiClient.get<DashboardIntegration[]>('/integrations');
    return response.data;
  },
  async inventory(outletId: string) {
    const response = await apiClient.get<InventoryResponse>(`/inventory/${outletId}`);
    return response.data;
  },
  async menus() {
    const response = await apiClient.get<Array<Omit<MenuItem, 'outletScope' | 'price' | 'variants'> & {
      priceAmount: number;
      currency: string;
      variants: string[];
      outletScopes: Array<{ outlet: { name: string } }>;
    }>>('/menus');
    return response.data.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      outletScope: item.outletScopes.map((scope) => scope.outlet.name),
      price: { amount: item.priceAmount, currency: item.currency as MenuItem['price']['currency'] },
      available: item.available,
      variants: item.variants
    }));
  }
};
