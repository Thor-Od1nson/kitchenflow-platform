'use client';

import type {
  AnalyticsSummary,
  AdvancedOperationalAnalytics,
  AuditLogResponse,
  Channel,
  DashboardIntegration,
  InventoryResponse,
  MenuItem,
  OperationalActivity,
  OperationalMetrics,
  Order,
  OrderStatus,
  PaginatedResponse,
  PayoutReconciliationSummary,
  QueueActivityEntry,
  QueueMetrics,
  OperationalIntelligenceSummary,
  WebhookEventLog
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
  clientMutationId?: string;
}

export interface DlqJob {
  id: string;
  originalJobId?: string | null;
  jobName: string;
  queue: string;
  failedReason: string;
  attemptsMade: number;
  dlqRetryCount: number;
  requestId?: string;
  movedAt: string;
  payload: Record<string, unknown>;
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
  async updateOrderStatus(orderId: string, status: OrderStatus, expectedUpdatedAt?: string) {
    const response = await apiClient.patch<Order>(`/orders/${orderId}/status`, { status, expectedUpdatedAt });
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
  async simulateAggregator(count = 3) {
    const response = await apiClient.post<{ created: number; failed: number }>('/aggregator/simulate', { count });
    return response.data;
  },
  async payoutReconciliation() {
    const response = await apiClient.get<PayoutReconciliationSummary>('/payouts/reconciliation');
    return response.data;
  },
  async reconcilePayouts() {
    const response = await apiClient.post<{ scanned: number; created: number; updated: number }>('/payouts/reconcile');
    return response.data;
  },
  async webhooks() {
    const response = await apiClient.get<WebhookEventLog[]>('/webhooks');
    return response.data;
  },
  async queueActivity() {
    const response = await apiClient.get<QueueActivityEntry[]>('/queues/activity');
    return response.data;
  },
  async queueMetrics() {
    const response = await apiClient.get<QueueMetrics>('/queues/metrics');
    return response.data;
  },
  async dlq() {
    const response = await apiClient.get<DlqJob[]>('/queues/dlq');
    return response.data;
  },
  async retryDlq(id: string) {
    const response = await apiClient.post(`/queues/dlq/${id}/retry`);
    return response.data;
  },
  async systemMetrics() {
    const response = await apiClient.get<OperationalMetrics>('/health/metrics');
    return response.data;
  },
  async enqueueTestFailure() {
    const response = await apiClient.post('/queues/test-failure');
    return response.data;
  },
  async controlCenter() {
    const response = await apiClient.get<OperationalIntelligenceSummary>('/analytics/control-center');
    return response.data;
  },
  async operationalIntelligence() {
    const response = await apiClient.get<AdvancedOperationalAnalytics>('/analytics/operational-intelligence');
    return response.data;
  },
  async retryWebhook(id: string) {
    const response = await apiClient.post(`/webhooks/${id}/retry`);
    return response.data;
  },
  async replayWebhook(id: string) {
    const response = await apiClient.post(`/webhooks/${id}/replay`);
    return response.data;
  },
  async runSlaScan() {
    const response = await apiClient.post('/queues/sla-scan');
    return response.data;
  },
  async audit(
    query: {
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
    } = {}
  ) {
    const response = await apiClient.get<AuditLogResponse>('/audit', { params: cleanParams(query) });
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
  },
  async updateMenuAvailability(ids: string[], available: boolean) {
    const response = await apiClient.patch('/menus/availability', { ids, available });
    return response.data;
  },
  async syncMenus() {
    const response = await apiClient.post('/menus/sync');
    return response.data;
  }
};
