'use client';

import type {
  AnalyticsSummary,
  Channel,
  DashboardIntegration,
  InventoryResponse,
  MenuItem,
  OperationalActivity,
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

export interface CreateOrderInput {
  outletId: string;
  channel: Channel;
  customerName: string;
  etaMinutes: number;
  items: Array<{ menuItemId: string; quantity: number }>;
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
  async createOrder(input: CreateOrderInput) {
    const response = await apiClient.post<Order>('/orders', input);
    return response.data;
  },
  async analyticsSummary() {
    const response = await apiClient.get<AnalyticsSummary>('/analytics/summary');
    return response.data;
  },
  async activity() {
    const response = await apiClient.get<OperationalActivity[]>('/analytics/activity');
    return response.data;
  },
  async integrations() {
    const response = await apiClient.get<DashboardIntegration[]>('/integrations');
    return response.data;
  },
  async inventory(outletId?: string) {
    const response = await apiClient.get<InventoryResponse>(outletId ? `/inventory/${outletId}` : '/inventory');
    return response.data;
  },
  async adjustInventory(outletId: string, itemId: string, delta: number, reason: string) {
    const response = await apiClient.patch(`/inventory/${outletId}/items/${itemId}/adjust`, { delta, reason });
    return response.data as { item: InventoryResponse['items'][number]; activity: InventoryResponse['activity'][number] };
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
