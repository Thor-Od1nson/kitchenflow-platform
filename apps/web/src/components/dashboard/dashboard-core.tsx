'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Activity, AlertCircle, ArrowUpRight, BarChart3, Bell, Clock, Eye, Loader2, Minus, PackageCheck, Plus, ShoppingCart, Timer } from 'lucide-react';
import { Badge, Button, Card, Input, MetricCard, ModalFrame, SearchInput, Skeleton } from '@kitchenflow/ui';
import type { Channel, InventoryItem, MenuItem, OperationalActivity, OperationsNotification, Order, OrderStatus, PaginatedResponse } from '@kitchenflow/types';
import { formatMoney, percentage, statusCopy, statusTone } from '@kitchenflow/utils';
import { useAuth } from '@/components/auth/auth-provider';
import { dashboardApi, type CreateOrderInput } from '@/lib/dashboard-api';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  useActivity,
  useAnalyticsSummary,
  useAudit,
  useControlCenter,
  useDlq,
  useIntegrations,
  useInventory,
  useMenus,
  useOrders,
  useOperationalIntelligence,
  usePayoutReconciliation,
  useQueueActivity,
  useQueueMetrics,
  useSystemMetrics,
  useWebhooks
} from '@/hooks/use-dashboard-data';
import { useOpsStore } from '@/store/ops-store';

const statusFilters: Array<OrderStatus | 'all'> = ['all', 'pending', 'accepted', 'preparing', 'dispatched', 'delivered', 'cancelled'];
const channelFilters: Array<Channel | 'all'> = ['all', 'swiggy', 'zomato', 'uber_eats', 'deliveroo'];
const activeQueueStatuses: OrderStatus[] = ['pending', 'accepted', 'preparing', 'dispatched'];
const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['dispatched'],
  dispatched: ['delivered'],
  delivered: [],
  cancelled: []
};

export function OverviewPage() {
  const summary = useAnalyticsSummary();
  const integrations = useIntegrations();
  const orders = useOrders({ page: 1, limit: 5 });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Command center" title="Live restaurant commerce operations" action="Export report" disabledReason="Coming soon" />
      <AsyncState loading={summary.isLoading} error={summary.isError}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summary.data?.kpis.map((kpi, index) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
              <MetricCard label={kpi.label} value={formatKpiValue(kpi.value, kpi.unit)} detail={`${percentage(kpi.delta)} vs last week`}>
                <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-royal">
                  <ArrowUpRight className="size-5" />
                </span>
              </MetricCard>
            </motion.div>
          ))}
        </div>
      </AsyncState>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]">
        <RevenuePanel />
        <LiveOrderFeed orders={orders.data?.items ?? []} loading={orders.isLoading} error={orders.isError} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <IntegrationsPanel items={integrations.data ?? []} loading={integrations.isLoading} error={integrations.isError} />
        <InventoryRiskPanel />
        <OutletPanel />
      </div>
    </div>
  );
}

export function ControlCenterPage() {
  const control = useControlCenter();
  const queueMetrics = useQueueMetrics();
  const systemMetrics = useSystemMetrics();
  const dlq = useDlq();
  const intelligence = useOperationalIntelligence();
  const orders = useOrders({ page: 1, limit: 8, status: 'all' });
  const socketStatus = useOpsStore((state) => state.socketStatus);
  const lastRealtimeAt = useOpsStore((state) => state.lastRealtimeAt);
  const triggerFailure = useMutation({
    mutationFn: dashboardApi.enqueueTestFailure,
    onSuccess: () => {
      void queueMetrics.refetch();
    }
  });
  const retryDlq = useMutation({
    mutationFn: dashboardApi.retryDlq,
    onSuccess: () => {
      void dlq.refetch();
      void queueMetrics.refetch();
    }
  });

  const stale = !lastRealtimeAt || Date.now() - Date.parse(lastRealtimeAt) > 30_000;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Global command center" title="Operational intelligence and reliability" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active orders" value={String(control.data?.activeOrders ?? 0)} detail="Live workflow load">
          <ShoppingCart className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="SLA breaches" value={String(control.data?.slaBreachCount ?? 0)} detail={`${control.data?.delayedDispatchCount ?? 0} delayed dispatches`}>
          <Timer className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Queue backlog" value={String(queueMetrics.data?.counts.backlog ?? 0)} detail={`${queueMetrics.data?.counts.failed ?? 0} failed jobs`}>
          <Activity className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Realtime" value={socketStatus} detail={stale ? 'Fallback polling active' : `Last event ${lastRealtimeAt ? formatDateTime(lastRealtimeAt) : 'none'}`}>
          <Bell className="size-5 text-royal" />
        </MetricCard>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="API health" value={systemMetrics.isError ? 'degraded' : 'healthy'} detail={`${systemMetrics.data?.requests.averageMs ?? 0}ms avg request`}>
          <Activity className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Queue latency" value={`${queueMetrics.data?.averageProcessingMs ?? 0}ms`} detail={`${queueMetrics.data?.counts.backlog ?? 0} jobs waiting`}>
          <Clock className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Websocket uptime" value={socketStatus} detail={`${systemMetrics.data?.websocket.activeConnections ?? 0} active connections`}>
          <Bell className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Retry spikes" value={String(systemMetrics.data?.queues?.retryCount ?? queueMetrics.data?.retryCount ?? 0)} detail={`${queueMetrics.data?.dlqCount ?? 0} DLQ jobs`}>
          <AlertCircle className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Webhook failures" value={String(systemMetrics.data?.webhooks?.failures ?? control.data?.failedWebhookCount ?? 0)} detail="Failed or rejected today">
          <AlertCircle className="size-5 text-royal" />
        </MetricCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Queue monitoring</h2>
            <Button size="sm" variant="secondary" onClick={() => triggerFailure.mutate()} disabled={triggerFailure.isPending}>
              {triggerFailure.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Test failed job
            </Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ['Active', queueMetrics.data?.counts.active ?? 0],
              ['Delayed', queueMetrics.data?.counts.delayed ?? 0],
              ['Completed', queueMetrics.data?.counts.completed ?? 0],
              ['Failed', queueMetrics.data?.counts.failed ?? 0],
              ['Retries', queueMetrics.data?.retryCount ?? 0],
              ['Avg ms', queueMetrics.data?.averageProcessingMs ?? 0]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line p-3">
                <p className="text-xs font-bold uppercase text-muted">{label}</p>
                <p className="mt-1 text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>
          <p className={`mt-4 text-sm font-semibold ${queueMetrics.data?.workerOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
            Worker {queueMetrics.data?.workerOnline ? 'online' : 'offline'} · heartbeat {queueMetrics.data?.workerHeartbeatAt ? formatDateTime(queueMetrics.data.workerHeartbeatAt) : 'none'}
          </p>
          <div className="mt-5 divide-y divide-line rounded-xl border border-line">
            <AsyncState loading={dlq.isLoading} error={dlq.isError} empty={!dlq.data?.length}>
              {dlq.data?.slice(0, 4).map((job) => (
                <div key={job.id} className="grid gap-2 p-3 text-sm md:grid-cols-[.8fr_1fr_.7fr]">
                  <div>
                    <p className="font-bold">{job.jobName}</p>
                    <p className="text-xs text-muted">{job.requestId ?? job.originalJobId ?? 'No request id'}</p>
                  </div>
                  <p className="text-muted">{job.failedReason}</p>
                  <Button size="sm" variant="secondary" onClick={() => retryDlq.mutate(job.id)} disabled={retryDlq.isPending || job.dlqRetryCount >= 3}>
                    Retry DLQ
                  </Button>
                </div>
              ))}
            </AsyncState>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-bold">System health</h2>
          <div className="mt-4 space-y-3">
            <AsyncState loading={control.isLoading} error={control.isError} empty={!control.data?.systemHealth.length}>
              {control.data?.systemHealth.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-line p-3 text-sm">
                  <div>
                    <p className="font-bold">{item.label}</p>
                    <p className="text-muted">{item.detail}</p>
                  </div>
                  <Badge className={item.status === 'critical' ? 'bg-rose-50 text-rose-700 ring-rose-200' : item.status === 'warning' ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}>{item.status}</Badge>
                </div>
              ))}
            </AsyncState>
          </div>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <h2 className="text-lg font-bold">Outlet operational status</h2>
          <div className="mt-4 divide-y divide-line rounded-xl border border-line">
            <AsyncState loading={control.isLoading} error={control.isError} empty={!control.data?.outletStatus.length}>
              {control.data?.outletStatus.map((outlet) => (
                <div key={outlet.outletId} className="grid gap-2 p-3 text-sm md:grid-cols-[1fr_.5fr_.5fr_.5fr]">
                  <p className="font-bold">{outlet.outlet}</p>
                  <p>{outlet.activeOrders} active</p>
                  <p>{outlet.slaBreaches} breaches</p>
                  <Badge className="bg-panel-muted text-muted ring-line">{outlet.status}</Badge>
                </div>
              ))}
            </AsyncState>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-bold">Active order stream</h2>
          <div className="mt-4 space-y-3">
            <AsyncState loading={orders.isLoading} error={orders.isError} empty={!orders.data?.items.length}>
              {orders.data?.items.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-lg border border-line p-3 text-sm">
                  <div>
                    <p className="font-bold">{order.publicId}</p>
                    <p className="text-muted">{order.outletName} · {order.channel.replace('_', ' ')}</p>
                  </div>
                  <Badge className={statusTone[order.status]}>{statusCopy[order.status]}</Badge>
                </div>
              ))}
            </AsyncState>
          </div>
        </Card>
      </div>
      <Card className="p-5">
        <h2 className="text-lg font-bold">Operational analytics</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MetricCard label="Slowest outlet" value={intelligence.data?.slowestFulfillmentOutlet?.outlet ?? 'n/a'} detail={`${intelligence.data?.slowestFulfillmentOutlet?.averageMinutes ?? 0}m average`}>
            <Clock className="size-5 text-royal" />
          </MetricCard>
          <MetricCard label="Busiest window" value={intelligence.data?.busiestTimeWindow?.hour ?? 'n/a'} detail={`${intelligence.data?.busiestTimeWindow?.orders ?? 0} orders`}>
            <BarChart3 className="size-5 text-royal" />
          </MetricCard>
          <MetricCard label="Bottleneck alerts" value={String(intelligence.data?.bottleneckAlerts.length ?? 0)} detail={`${intelligence.data?.cancellationSpikes.length ?? 0} cancellation spikes`}>
            <AlertCircle className="size-5 text-royal" />
          </MetricCard>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          {intelligence.data?.outletLoadComparison.map((row) => (
            <div key={row.outlet} className="rounded-lg border border-line p-3">
              <p className="text-sm font-bold">{row.outlet}</p>
              <div className="mt-2 h-2 rounded-full bg-panel-muted">
                <div className="h-full rounded-full bg-royal" style={{ width: `${Math.min(100, row.loadScore)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function OrdersPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [channel, setChannel] = useState<Channel | 'all'>('all');
  const [outletId, setOutletId] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ tone: 'error'; text: string } | null>(null);
  const orders = useOrders({ page, limit: 12, status, channel, outletId, query });
  const menus = useMenus();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updateStatus = useMutation({
    mutationFn: ({ orderId, nextStatus, expectedUpdatedAt }: { orderId: string; nextStatus: OrderStatus; expectedUpdatedAt?: string }) =>
      dashboardApi.updateOrderStatus(orderId, nextStatus, expectedUpdatedAt),
    onMutate: async ({ orderId, nextStatus }) => {
      setStatusMessage(null);
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      const previousOrders = queryClient.getQueriesData<PaginatedResponse<Order>>({ queryKey: ['orders'] });
      const optimisticUpdatedAt = new Date().toISOString();
      queryClient.setQueriesData<PaginatedResponse<Order>>({ queryKey: ['orders'] }, (existing) =>
        existing
          ? {
              ...existing,
              items: existing.items.map((order) =>
                order.id === orderId
                  ? {
                      ...order,
                      status: nextStatus,
                      updatedAt: optimisticUpdatedAt,
                      ...timestampPatch(nextStatus, optimisticUpdatedAt)
                    }
                  : order
              )
            }
          : existing
      );
      setSelectedOrder((order) =>
        order?.id === orderId
          ? { ...order, status: nextStatus, updatedAt: optimisticUpdatedAt, ...timestampPatch(nextStatus, optimisticUpdatedAt) }
          : order
      );
      return { previousOrders };
    },
    onSuccess: (updatedOrder) => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      setSelectedOrder((order) => (order?.id === updatedOrder.id ? updatedOrder : order));
    },
    onError: (error, _variables, context) => {
      context?.previousOrders.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      setStatusMessage({ tone: 'error', text: getMutationErrorMessage(error) });
    }
  });
  const createOrder = useMutation({
    mutationFn: dashboardApi.createOrder,
    onSuccess: (order) => {
      queryClient.setQueriesData<PaginatedResponse<Order>>({ queryKey: ['orders'] }, (existing) =>
        existing ? { ...existing, items: [order, ...existing.items.filter((item) => item.id !== order.id)].slice(0, existing.limit) } : existing
      );
      setCreatingOrder(false);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    },
    onError: (error) => {
      setStatusMessage({ tone: 'error', text: getMutationErrorMessage(error) });
    }
  });

  function updateOrder(order: Order, nextStatus: OrderStatus) {
    updateStatus.mutate({ orderId: order.id, nextStatus, expectedUpdatedAt: order.updatedAt });
  }

  const visibleOrders = orders.data?.items ?? [];
  const selectedOrderView = selectedOrder ? visibleOrders.find((order) => order.id === selectedOrder.id) ?? selectedOrder : null;
  const canManageOrders = Boolean(user && ['owner', 'manager', 'kitchen'].includes(user.role));
  const manualOrderOutlets = useMemo(
    () => (user?.restaurant?.outlets?.length ? user.restaurant.outlets : outletsFromOrders(visibleOrders)),
    [user?.restaurant?.outlets, visibleOrders]
  );
  useEffect(() => {
    if (!selectedOrder) return;
    const updated = visibleOrders.find((order) => order.id === selectedOrder.id);
    if (updated && updated.updatedAt !== selectedOrder.updatedAt) setSelectedOrder(updated);
  }, [selectedOrder, visibleOrders]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Order management"
        title="Kitchen workflow and delivery tracking"
        action={canManageOrders ? 'Create manual order' : undefined}
        onAction={canManageOrders ? () => setCreatingOrder(true) : undefined}
      />
      {statusMessage ? (
        <div
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700"
        >
          <AlertCircle className="size-4" />
          {statusMessage.text}
        </div>
      ) : null}
      <Card className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            placeholder="Search orders or customers"
          />
          <div className="flex flex-wrap gap-2">
            {manualOrderOutlets.length ? (
              <select
                className="h-9 rounded-xl border border-line bg-panel px-3 text-sm font-semibold text-ink"
                value={outletId}
                onChange={(event) => {
                  setPage(1);
                  setOutletId(event.target.value);
                }}
              >
                <option value="all">All outlets</option>
                {manualOrderOutlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            ) : null}
            {statusFilters.map((filter) => (
              <Button
                key={filter}
                variant={status === filter ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setPage(1);
                  setStatus(filter);
                }}
              >
                {filter === 'all' ? 'All' : statusCopy[filter]}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {channelFilters.map((filter) => (
            <Button
              key={filter}
              variant={channel === filter ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setPage(1);
                setChannel(filter);
              }}
            >
              {filter === 'all' ? 'All channels' : filter.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </Card>
      <KitchenQueue orders={visibleOrders} loading={orders.isLoading} error={orders.isError} />
      <Card className="overflow-hidden">
        <AsyncTableState loading={orders.isLoading} error={orders.isError} empty={!orders.data?.items.length}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="border-b border-line bg-panel-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  {['Order', 'Channel', 'Customer', 'Outlet', 'SLA', 'Total', 'Status', 'Actions', 'Detail'].map((head) => (
                    <th key={head} className="px-5 py-4 font-bold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-panel">
                {orders.data?.items.map((order) => (
                  <tr key={order.id} className="hover:bg-panel-muted">
                    <td className="px-5 py-4 font-bold text-ink">{order.publicId}</td>
                    <td className="px-5 py-4 capitalize text-muted">{order.channel.replace('_', ' ')}</td>
                    <td className="px-5 py-4">{order.customerName}</td>
                    <td className="px-5 py-4">{order.outletName}</td>
                    <td className="px-5 py-4"><SlaBadge order={order} /></td>
                    <td className="px-5 py-4 font-semibold">{formatMoney(order.total.amount, order.total.currency)}</td>
                    <td className="px-5 py-4">
                      <Badge className={statusTone[order.status]}>{statusCopy[order.status]}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      {canManageOrders ? (
                        <OrderActions order={order} loadingOrderId={updateStatus.variables?.orderId} loading={updateStatus.isPending} onUpdate={updateOrder} />
                      ) : (
                        <span className="text-xs font-semibold text-muted">Read only</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)} aria-label={`View ${order.publicId}`}>
                        <Eye className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncTableState>
      </Card>
      <Pagination page={page} totalPages={orders.data?.totalPages ?? 1} onPage={setPage} />
      {selectedOrderView ? (
        <OrderDetailModal
          order={selectedOrderView}
          loadingOrderId={updateStatus.variables?.orderId}
          loading={updateStatus.isPending}
          onUpdate={updateOrder}
          canManageOrders={canManageOrders}
          onClose={() => setSelectedOrder(null)}
        />
      ) : null}
      {creatingOrder && canManageOrders ? (
        <ManualOrderModal
          outlets={manualOrderOutlets}
          menus={menus.data ?? []}
          menusLoading={menus.isLoading}
          menusError={menus.isError}
          loading={createOrder.isPending}
          onClose={() => setCreatingOrder(false)}
          onCreate={(input) => createOrder.mutate(input)}
        />
      ) : null}
    </div>
  );
}

function KitchenQueue({ orders, loading, error }: { orders: Order[]; loading: boolean; error: boolean }) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {activeQueueStatuses.map((queueStatus) => {
        const queueOrders = orders.filter((order) => order.status === queueStatus);
        return (
          <Card key={queueStatus} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide">{statusCopy[queueStatus]}</h2>
                <p className="text-xs font-semibold text-muted">{queueOrders.length} active</p>
              </div>
              <Badge className={statusTone[queueStatus]}>{queueOrders.length}</Badge>
            </div>
            <div className="mt-4 min-h-32 space-y-3">
              <AsyncState loading={loading} error={error} empty={!queueOrders.length}>
                {queueOrders.slice(0, 4).map((order) => (
                  <div key={order.id} className="rounded-lg border border-line bg-panel-muted p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-ink">{order.publicId}</p>
                      <SlaBadge order={order} compact />
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold text-muted">{order.customerName}</p>
                    <p className="mt-1 truncate text-xs text-muted">{order.outletName}</p>
                  </div>
                ))}
              </AsyncState>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function OrderActions({
  order,
  loadingOrderId,
  loading,
  onUpdate
}: {
  order: Order;
  loadingOrderId?: string;
  loading: boolean;
  onUpdate: (order: Order, nextStatus: OrderStatus) => void;
}) {
  const nextStatuses = orderTransitions[order.status];
  const isThisOrderLoading = loading && loadingOrderId === order.id;
  if (!nextStatuses.length) {
    return <span className="text-xs font-semibold text-muted">No actions</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {nextStatuses.map((nextStatus) => (
        <Button
          key={nextStatus}
          size="sm"
          variant={nextStatus === 'cancelled' ? 'danger' : 'secondary'}
          onClick={() => onUpdate(order, nextStatus)}
          disabled={loading}
        >
          {isThisOrderLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          {actionCopy(nextStatus)}
        </Button>
      ))}
    </div>
  );
}

function OrderDetailModal({
  order,
  loadingOrderId,
  loading,
  onUpdate,
  canManageOrders,
  onClose
}: {
  order: Order;
  loadingOrderId?: string;
  loading: boolean;
  onUpdate: (order: Order, nextStatus: OrderStatus) => void;
  canManageOrders: boolean;
  onClose: () => void;
}) {
  const timeline: Array<{ label: string; value?: string | null }> = [
    { label: 'Placed', value: order.placedAt },
    { label: 'Accepted', value: order.acceptedAt },
    { label: 'Preparing', value: order.preparingAt },
    { label: 'Dispatched', value: order.dispatchedAt },
    { label: 'Delivered', value: order.deliveredAt },
    { label: 'Cancelled', value: order.cancelledAt }
  ];

  return (
    <ModalFrame title={`${order.publicId} details`} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">{order.customerName}</p>
            <p className="mt-1 text-xs font-semibold capitalize text-muted">
              {order.channel.replace('_', ' ')} - {order.outletName}
            </p>
          </div>
          <Badge className={statusTone[order.status]}>{statusCopy[order.status]}</Badge>
        </div>
        <div className="grid gap-3 rounded-xl border border-line bg-panel-muted p-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Total</p>
            <p className="mt-1 font-black">{formatMoney(order.total.amount, order.total.currency)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">SLA</p>
            <p className="mt-1 font-black">{order.etaMinutes} min</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Updated</p>
            <p className="mt-1 font-black">{formatDateTime(order.updatedAt)}</p>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-black">Items</h3>
          <div className="mt-3 divide-y divide-line rounded-xl border border-line">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 p-3 text-sm">
                <div>
                  <p className="font-bold">{item.quantity}x {item.name}</p>
                  {item.modifiers?.length ? <p className="mt-1 text-xs text-muted">{item.modifiers.join(', ')}</p> : null}
                </div>
                <span className="font-semibold">{formatMoney(item.price.amount, item.price.currency)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-black">Status timeline</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {timeline.map((step) => (
              <div key={step.label} className="rounded-lg border border-line p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{step.label}</p>
                <p className="mt-1 text-sm font-semibold">{step.value ? formatDateTime(step.value) : 'Not reached'}</p>
              </div>
            ))}
          </div>
        </div>
        {canManageOrders ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <OrderActions order={order} loadingOrderId={loadingOrderId} loading={loading} onUpdate={onUpdate} />
          </div>
        ) : null}
      </div>
    </ModalFrame>
  );
}

function ManualOrderModal({
  outlets,
  menus,
  menusLoading,
  menusError,
  loading,
  onCreate,
  onClose
}: {
  outlets: Array<{ id: string; name: string; city: string }>;
  menus: MenuItem[];
  menusLoading: boolean;
  menusError: boolean;
  loading: boolean;
  onCreate: (input: CreateOrderInput) => void;
  onClose: () => void;
}) {
  const defaultOutletId = outlets[0]?.id ?? '';
  const [outletId, setOutletId] = useState(defaultOutletId);
  const [channel, setChannel] = useState<Channel>('direct');
  const [customerName, setCustomerName] = useState('');
  const [etaMinutes, setEtaMinutes] = useState(25);
  const [clientMutationId] = useState(() => `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const selectedOutlet = outlets.find((outlet) => outlet.id === outletId);
  const availableMenus = useMemo(
    () => menus.filter((item) => item.available && (!selectedOutlet || !item.outletScope.length || item.outletScope.includes(selectedOutlet.name))),
    [menus, selectedOutlet]
  );
  const defaultMenuId = availableMenus[0]?.id ?? '';
  const [lines, setLines] = useState<Array<{ menuItemId: string; quantity: number }>>([{ menuItemId: '', quantity: 1 }]);
  useEffect(() => {
    if (!outletId && defaultOutletId) setOutletId(defaultOutletId);
    if (defaultMenuId) {
      setLines((current) => current.map((line) => (line.menuItemId ? line : { ...line, menuItemId: defaultMenuId })));
    }
  }, [defaultMenuId, defaultOutletId, outletId]);

  useEffect(() => {
    setLines((current) =>
      current.map((line) => (availableMenus.some((item) => item.id === line.menuItemId) ? line : { ...line, menuItemId: defaultMenuId }))
    );
  }, [defaultMenuId, outletId, availableMenus]);

  const total = lines.reduce((sum, line) => {
    const item = availableMenus.find((menu) => menu.id === line.menuItemId);
    return sum + (item?.price.amount ?? 0) * line.quantity;
  }, 0);

  function submit() {
    const items = lines.filter((line) => availableMenus.some((item) => item.id === line.menuItemId) && line.quantity > 0);
    if (!outletId || !customerName.trim() || !items.length || total <= 0) return;
    onCreate({ outletId, channel, customerName: customerName.trim(), etaMinutes, items, clientMutationId });
  }

  return (
    <ModalFrame title="Create manual order" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-semibold">
            Customer
            <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer name" />
          </label>
          <label className="space-y-1 text-sm font-semibold">
            ETA minutes
            <Input type="number" min={1} value={etaMinutes} onChange={(event) => setEtaMinutes(Number(event.target.value))} />
          </label>
          <label className="space-y-1 text-sm font-semibold">
            Outlet
            <select className="h-10 w-full rounded-xl border border-line bg-panel px-3 text-sm text-ink" value={outletId} onChange={(event) => setOutletId(event.target.value)}>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-semibold">
            Channel
            <select className="h-10 w-full rounded-xl border border-line bg-panel px-3 text-sm text-ink" value={channel} onChange={(event) => setChannel(event.target.value as Channel)}>
              {['direct', 'swiggy', 'zomato', 'uber_eats', 'deliveroo', 'talabat', 'doordash'].map((item) => (
                <option key={item} value={item}>{item.replace('_', ' ')}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black">Items</h3>
            <Button size="sm" variant="secondary" disabled={!availableMenus.length} onClick={() => setLines((current) => [...current, { menuItemId: defaultMenuId, quantity: 1 }])}>
              <Plus className="size-4" />
              Add
            </Button>
          </div>
          {menusLoading ? <LoadingRows /> : null}
          {menusError ? <ErrorState /> : null}
          {!menusLoading && !menusError && !availableMenus.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
              No available menu items for this outlet.
            </div>
          ) : null}
          {lines.map((line, index) => (
            <div key={`${line.menuItemId}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_88px_40px]">
              <select
                className="h-10 rounded-xl border border-line bg-panel px-3 text-sm text-ink"
                value={line.menuItemId}
                onChange={(event) =>
                  setLines((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, menuItemId: event.target.value } : item)))
                }
              >
                {availableMenus.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <Input
                type="number"
                min={1}
                value={line.quantity}
                onChange={(event) =>
                  setLines((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, quantity: Number(event.target.value) } : item)))
                }
              />
              <Button size="sm" variant="ghost" onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove item">
                <Minus className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-line bg-panel-muted p-3">
          <span className="text-sm font-bold">Total</span>
          <span className="text-lg font-black">{formatMoney(total)}</span>
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={loading || menusLoading || menusError || !customerName.trim() || !lines.some((line) => line.menuItemId) || total <= 0}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
            Create order
          </Button>
        </div>
      </div>
    </ModalFrame>
  );
}

function SlaBadge({ order, compact }: { order: Order; compact?: boolean }) {
  const now = useNow();
  const state = getSlaState(order, now);
  const label = state.remainingMs <= 0 ? `${Math.abs(state.minutes)}m overdue` : `${state.minutes}m left`;
  const tone =
    state.level === 'red'
      ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-800'
      : state.level === 'yellow'
        ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800'
        : 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800';

  return (
    <Badge className={tone}>
      {compact ? null : <Timer className="mr-1 size-3" />}
      {label}
    </Badge>
  );
}

export function MenusPage() {
  const { user } = useAuth();
  const canManageMenus = Boolean(user && ['owner', 'manager'].includes(user.role));
  const menus = useMenus();
  const queryClient = useQueryClient();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const updateAvailability = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) => dashboardApi.updateMenuAvailability([id], available),
    onSuccess: () => {
      setStatusMessage(null);
      void queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
    onError: (error) => setStatusMessage(getMutationErrorMessage(error))
  });
  const syncMenus = useMutation({
    mutationFn: dashboardApi.syncMenus,
    onSuccess: () => setStatusMessage('Menu sync queued.'),
    onError: (error) => setStatusMessage(getMutationErrorMessage(error))
  });
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Menu management"
        title="Pricing, availability, variants, and outlet scopes"
        action={canManageMenus ? 'Bulk sync' : undefined}
        onAction={canManageMenus ? () => syncMenus.mutate() : undefined}
      />
      {statusMessage ? (
        <div className="rounded-xl border border-line bg-panel-muted p-3 text-sm font-semibold text-muted">{statusMessage}</div>
      ) : null}
      <AsyncState loading={menus.isLoading} error={menus.isError} empty={!menus.data?.length}>
        <div className="grid gap-4 lg:grid-cols-3">
          {menus.data?.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-royal">{item.category}</p>
                  <h3 className="mt-2 text-lg font-bold">{item.name}</h3>
                </div>
                {canManageMenus ? (
                  <button
                    className={`h-6 w-11 rounded-full p-1 transition disabled:opacity-50 ${item.available ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    aria-label="Toggle availability"
                    disabled={updateAvailability.isPending}
                    onClick={() => updateAvailability.mutate({ id: item.id, available: !item.available })}
                  >
                    <span className={`block size-4 rounded-full bg-white transition ${item.available ? 'translate-x-5' : ''}`} />
                  </button>
                ) : (
                  <Badge className={item.available ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}>
                    {item.available ? 'available' : 'paused'}
                  </Badge>
                )}
              </div>
              <p className="mt-4 text-2xl font-black">{formatMoney(item.price.amount, item.price.currency)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.variants.map((variant) => (
                  <Badge key={variant} className="bg-panel-muted text-muted ring-line">{variant}</Badge>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted">{item.outletScope.join(', ')}</p>
            </Card>
          ))}
        </div>
      </AsyncState>
    </div>
  );
}

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Analytics" title="Revenue, conversion, heatmaps, and outlet performance" action="Schedule digest" disabledReason="Coming soon" />
      <KitchenPerformancePanel />
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <RevenuePanel />
        <OutletPanel />
      </div>
      <ChannelPanel />
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <PayoutReconciliationPanel />
        <OperationalAnalyticsPanel />
      </div>
    </div>
  );
}

export function IntegrationsPage() {
  const { user } = useAuth();
  const integrations = useIntegrations();
  const webhooks = useWebhooks();
  const queueClient = useQueryClient();
  const simulate = useMutation({
    mutationFn: () => dashboardApi.simulateAggregator(4),
    onSuccess: () => {
      void queueClient.invalidateQueries({ queryKey: ['orders'] });
      void queueClient.invalidateQueries({ queryKey: ['webhooks'] });
      void queueClient.invalidateQueries({ queryKey: ['queue-activity'] });
    }
  });
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integration marketplace"
        title="Aggregator, POS, accounting, and webhook health"
        action={user && ['owner', 'manager'].includes(user.role) ? 'Simulate orders' : undefined}
        onAction={user && ['owner', 'manager'].includes(user.role) ? () => simulate.mutate() : undefined}
      />
      {simulate.data ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          Created {simulate.data.created} simulated orders. Failed retries: {simulate.data.failed}.
        </div>
      ) : null}
      <AsyncState loading={integrations.isLoading} error={integrations.isError} empty={!integrations.data?.length}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {integrations.data?.map((integration) => (
            <Card key={integration.id} className="p-5">
              <div className="flex items-center justify-between">
                <div className="grid size-12 place-items-center rounded-xl bg-ink text-sm font-black text-white">
                  {integration.label.slice(0, 2).toUpperCase()}
                </div>
                <Badge className={integration.status === 'connected' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}>
                  {integration.status}
                </Badge>
              </div>
              <h3 className="mt-5 text-xl font-black">{integration.label}</h3>
              <p className="mt-2 text-sm text-muted">Last sync {integration.lastSync}. Webhook delivery health at {integration.webhookHealth}%.</p>
              <div className="mt-5 h-2 rounded-full bg-panel-muted">
                <div className="h-full rounded-full bg-royal" style={{ width: `${integration.webhookHealth}%` }} />
              </div>
            </Card>
          ))}
        </div>
      </AsyncState>
      <WebhookEventPanel loading={webhooks.isLoading} error={webhooks.isError} rows={webhooks.data ?? []} />
    </div>
  );
}

export function InventoryPage() {
  const { user } = useAuth();
  const canAdjustInventory = Boolean(user && ['owner', 'manager'].includes(user.role));
  const outlets = user?.restaurant?.outlets ?? [];
  const [outletId, setOutletId] = useState(outlets[0]?.id);
  const inventory = useInventory(outletId);
  const queryClient = useQueryClient();
  const adjustInventory = useMutation({
    mutationFn: ({ item, delta, reason }: { item: InventoryItem; delta: number; reason: string }) =>
      dashboardApi.adjustInventory(item.outletId, item.id, delta, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    }
  });
  useEffect(() => {
    if (!outletId && outlets[0]?.id) setOutletId(outlets[0].id);
  }, [outletId, outlets]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Inventory" title="Stock intelligence and outlet replenishment" action={canAdjustInventory ? 'Sync stock' : undefined} disabledReason={canAdjustInventory ? 'Coming soon' : undefined} />
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {outlets.map((outlet) => (
            <Button key={outlet.id} variant={outletId === outlet.id ? 'primary' : 'secondary'} size="sm" onClick={() => setOutletId(outlet.id)}>
              {outlet.name}
            </Button>
          ))}
        </div>
      </Card>
      <AsyncState loading={inventory.isLoading} error={inventory.isError} empty={!inventory.data?.items.length}>
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {inventory.data?.items.map((item) => (
              <Card key={item.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-royal">{item.sku}</p>
                    <h3 className="mt-2 text-lg font-bold">{item.name}</h3>
                  </div>
                  <Badge className={inventoryTone(item.risk)}>{item.risk}</Badge>
                </div>
                <p className="mt-4 text-2xl font-black">{item.quantity} {item.unit}</p>
                <p className="mt-1 text-sm text-muted">Reorder at {item.reorderAt} {item.unit}</p>
                <div className="mt-5 h-2 rounded-full bg-panel-muted">
                  <div className={`h-full rounded-full ${item.risk === 'critical' ? 'bg-rose-500' : item.risk === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${item.stockPercent}%` }} />
                </div>
                {canAdjustInventory ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => adjustInventory.mutate({ item, delta: 5, reason: 'Manual restock' })} disabled={adjustInventory.isPending}>
                      <Plus className="size-4" />
                      Restock
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => adjustInventory.mutate({ item, delta: -1, reason: 'Stock deduction simulation' })} disabled={adjustInventory.isPending || item.quantity <= 0}>
                      <Minus className="size-4" />
                      Deduct
                    </Button>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Inventory activity</h2>
              <PackageCheck className="size-5 text-royal" />
            </div>
            <div className="mt-4 space-y-3">
              <AsyncState loading={inventory.isLoading} error={inventory.isError} empty={!inventory.data?.activity.length}>
                {inventory.data?.activity.map((item) => (
                  <div key={item.id} className="rounded-lg border border-line bg-panel-muted p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold">{item.name}</p>
                      <span className={`text-sm font-black ${item.delta < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {item.delta > 0 ? '+' : ''}{item.delta}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{item.reason} - now {item.quantityAfter}</p>
                  </div>
                ))}
              </AsyncState>
            </div>
          </Card>
        </div>
      </AsyncState>
    </div>
  );
}

export function SimpleOpsPage({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} action="Configure" disabledReason="Coming soon" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {['Operational policy', 'Automation rules', 'Audit timeline', 'Approval queue', 'SLA monitors', 'Team ownership'].map((item) => (
          <Card key={item} className="p-5">
            <Activity className="size-5 text-royal" />
            <h3 className="mt-4 font-bold">{item}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Enterprise controls with outlet-specific permissions, live telemetry, and change history for franchise scale.
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const notifications = useOpsStore((state) => state.notifications);
  const clearNotifications = useOpsStore((state) => state.clearNotifications);
  const markAllRead = useOpsStore((state) => state.markAllRead);
  const clearDismissed = useOpsStore((state) => state.clearDismissed);
  const activity = useActivity();
  const queueActivity = useQueueActivity();
  const activityNotifications = (activity.data ?? []).map(activityToNotification);
  const rows = [...notifications].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Notifications" title="Operational alerts and incident routing" action="Clear" onAction={clearNotifications} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={markAllRead}>Mark all as read</Button>
        <Button size="sm" variant="secondary" onClick={clearDismissed}>Clear dismissed</Button>
      </div>
      <Card className="overflow-hidden">
        <AsyncTableState loading={false} error={false} empty={!rows.length}>
          <div className="divide-y divide-line">
            {rows.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} />
            ))}
          </div>
        </AsyncTableState>
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b border-line p-4">
          <h2 className="text-lg font-bold">Durable activity history</h2>
        </div>
        <AsyncTableState loading={activity.isLoading} error={activity.isError} empty={!activityNotifications.length}>
          <div className="divide-y divide-line">
            {activityNotifications.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} />
            ))}
          </div>
        </AsyncTableState>
      </Card>
      <QueueActivityPanel loading={queueActivity.isLoading} error={queueActivity.isError} rows={queueActivity.data ?? []} />
    </div>
  );
}

export function AuditPage() {
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [actorRole, setActorRole] = useState('all');
  const [operationType, setOperationType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const audit = useAudit({ page, limit: 20, query, action, severity, actorRole, operationType, dateFrom, dateTo });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Audit" title="Operational audit timeline" />
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            placeholder="Search action, entity, outlet"
          />
          <select
            className="h-10 rounded-xl border border-line bg-panel px-3 text-sm font-semibold text-ink"
            value={action}
            onChange={(event) => {
              setPage(1);
              setAction(event.target.value);
            }}
          >
            <option value="all">All actions</option>
            {['auth.login', 'auth.logout', 'auth.failed', 'order.created', 'order.status_changed', 'inventory.adjusted', 'inventory.low_stock'].map((item) => (
              <option key={item} value={item}>
                {item.replace('.', ' ')}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border border-line bg-panel px-3 text-sm font-semibold text-ink"
            value={severity}
            onChange={(event) => {
              setPage(1);
              setSeverity(event.target.value);
            }}
          >
            <option value="all">All severities</option>
            {['info', 'warning', 'error', 'critical'].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border border-line bg-panel px-3 text-sm font-semibold text-ink"
            value={actorRole}
            onChange={(event) => {
              setPage(1);
              setActorRole(event.target.value);
            }}
          >
            <option value="all">All actors</option>
            {['owner', 'manager', 'kitchen', 'support'].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Input
            value={operationType}
            onChange={(event) => {
              setPage(1);
              setOperationType(event.target.value);
            }}
            placeholder="Operation type"
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setPage(1);
              setDateFrom(event.target.value);
            }}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setPage(1);
              setDateTo(event.target.value);
            }}
          />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <AsyncTableState loading={audit.isLoading} error={audit.isError} empty={!audit.data?.items.length}>
          <div className="divide-y divide-line">
            {audit.data?.items.map((item) => (
              <div key={item.id} className="grid gap-3 p-4 text-sm lg:grid-cols-[1.2fr_.9fr_.8fr_.8fr]">
                <div>
                  <p className="font-bold">{item.action.replace('.', ' ')}</p>
                  <p className="mt-1 text-xs text-muted">{item.entityType}{item.entityId ? ` - ${item.entityId}` : ''}</p>
                  <Badge className={item.severity === 'warning' ? 'mt-2 bg-amber-50 text-amber-700 ring-amber-200' : 'mt-2 bg-panel-muted text-muted ring-line'}>{item.severity ?? 'info'}</Badge>
                </div>
                <div>
                  <p className="font-semibold">{item.actorRole ?? 'system'}</p>
                  <p className="mt-1 text-xs text-muted">{item.actorUserId ?? 'No actor'}</p>
                </div>
                <div>
                  <p className="font-semibold">{item.outletName ?? 'All outlets'}</p>
                  <p className="mt-1 text-xs text-muted">{item.correlationId ?? 'No correlation id'}</p>
                </div>
                <p className="font-semibold text-muted">{formatDateTime(item.createdAt)}</p>
              </div>
            ))}
          </div>
        </AsyncTableState>
      </Card>
      <Pagination page={page} totalPages={audit.data?.totalPages ?? 1} onPage={setPage} />
    </div>
  );
}

function activityToNotification(activity: OperationalActivity): OperationsNotification {
  return {
    id: `activity:${activity.id}`,
    type: 'activity',
    title: activity.title,
    detail: activity.outletName ? `${activity.detail} - ${activity.outletName}` : activity.detail,
    createdAt: activity.occurredAt,
    tone: activity.tone
  };
}

function NotificationRow({ notification }: { notification: OperationsNotification }) {
  return (
    <div className="flex items-start gap-3 p-4">
      <span className={`mt-1 grid size-9 shrink-0 place-items-center rounded-full ${notificationTone(notification.tone)}`}>
        <Bell className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="font-bold">{notification.title}</p>
        <p className="mt-1 text-sm text-muted">{notification.detail}</p>
        <p className="mt-2 text-xs font-semibold text-muted">{formatDateTime(notification.createdAt)}</p>
      </div>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  action,
  onAction,
  disabledReason
}: {
  eyebrow: string;
  title: string;
  action?: string;
  onAction?: () => void;
  disabledReason?: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-royal">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
      </div>
      {action ? (
        <Button onClick={onAction} disabled={Boolean(disabledReason) || !onAction} title={disabledReason}>
          {action}
        </Button>
      ) : null}
    </div>
  );
}

function RevenuePanel() {
  const summary = useAnalyticsSummary();
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Revenue and order trend</h2>
          <p className="text-sm text-muted">Live GMV across aggregators and direct channels</p>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">realtime</Badge>
      </div>
      <div className="mt-5 h-80">
        <AsyncChartState loading={summary.isLoading} error={summary.isError} empty={!summary.data?.revenueSeries.length}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={summary.data?.revenueSeries ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e9f1" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Area dataKey="revenue" stroke="#246bfe" fill="#dbeafe" strokeWidth={3} />
              <Area dataKey="orders" stroke="#28d7ef" fill="#cffafe" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </AsyncChartState>
      </div>
    </Card>
  );
}

function LiveOrderFeed({ orders, loading, error }: { orders: Order[]; loading: boolean; error: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Live order feed</h2>
        <Clock className="size-5 text-royal" />
      </div>
      <div className="mt-5 space-y-3">
        <AsyncState loading={loading} error={error} empty={!orders.length}>
          {orders.map((order) => (
            <motion.div layout key={order.id} className="rounded-xl border border-line p-4">
              <div className="flex items-center justify-between">
                <p className="font-bold">{order.publicId}</p>
                <Badge className={statusTone[order.status]}>{statusCopy[order.status]}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">
                {order.customerName} - {order.outletName} - {formatMoney(order.total.amount, order.total.currency)}
              </p>
            </motion.div>
          ))}
        </AsyncState>
      </div>
    </Card>
  );
}

function IntegrationsPanel({ items, loading, error }: { items: Array<{ id: string; label: string; status: string }>; loading: boolean; error: boolean }) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold">Sync states</h2>
      <div className="mt-4 space-y-3">
        <AsyncState loading={loading} error={error} empty={!items.length}>
          {items.slice(0, 4).map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <span className="font-semibold">{item.label}</span>
              <Badge className="bg-panel-muted text-muted ring-line">{item.status}</Badge>
            </div>
          ))}
        </AsyncState>
      </div>
    </Card>
  );
}

function InventoryRiskPanel() {
  const summary = useAnalyticsSummary();
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Inventory risk</h2>
        <PackageCheck className="size-5 text-royal" />
      </div>
      <div className="mt-5 space-y-4">
        <AsyncState loading={summary.isLoading} error={summary.isError} empty={!summary.data?.inventoryWarnings.length}>
          {summary.data?.inventoryWarnings.slice(0, 4).map((item) => (
            <div key={item.id}>
              <div className="flex justify-between text-sm font-semibold">
                <span>{item.name}</span>
                <span>{item.stockPercent}%</span>
              </div>
              <p className="mt-1 text-xs text-muted">{item.outletName}</p>
              <div className="mt-2 h-2 rounded-full bg-panel-muted">
                <div className="h-full rounded-full bg-royal" style={{ width: `${item.stockPercent}%` }} />
              </div>
            </div>
          ))}
        </AsyncState>
      </div>
    </Card>
  );
}

function KitchenPerformancePanel() {
  const summary = useAnalyticsSummary();
  const activeLoad = summary.data
    ? summary.data.operational.activeKitchenLoad
    : 0;
  const throughput = summary.data?.totals.ordersToday ?? 0;
  const cancellationRate = summary.data?.totals.cancellationRate ?? 0;
  const queueLatency = summary.data?.operational.averageQueueLatencyMinutes ?? 0;
  const slaBreaches = summary.data?.operational.slaBreaches ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Active kitchen load" value={String(activeLoad)} detail="Orders in live workflow">
        <Activity className="size-5 text-royal" />
      </MetricCard>
      <MetricCard label="Queue latency" value={`${queueLatency}m`} detail={`${slaBreaches} SLA breaches today`}>
        <Clock className="size-5 text-royal" />
      </MetricCard>
      <MetricCard label="Throughput" value={String(throughput)} detail="Orders completed today">
        <PackageCheck className="size-5 text-royal" />
      </MetricCard>
      <MetricCard label="Cancellation" value={`${cancellationRate}%`} detail="Current day rate">
        <AlertCircle className="size-5 text-royal" />
      </MetricCard>
    </div>
  );
}

function OutletPanel() {
  const summary = useAnalyticsSummary();
  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold">Outlet comparison</h2>
      <div className="mt-5 h-64">
        <AsyncChartState loading={summary.isLoading} error={summary.isError} empty={!summary.data?.outletPerformance.length}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.data?.outletPerformance ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e9f1" />
              <XAxis dataKey="outlet" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#246bfe" radius={[6, 6, 0, 0]} />
              <Bar dataKey="orders" fill="#28d7ef" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AsyncChartState>
      </div>
    </Card>
  );
}

function ChannelPanel() {
  const summary = useAnalyticsSummary();
  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold">Channel breakdown</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <AsyncState loading={summary.isLoading} error={summary.isError} empty={!summary.data?.channelBreakdown.length}>
          {summary.data?.channelBreakdown.map((channel) => (
            <div key={channel.channel} className="rounded-xl border border-line bg-panel p-4">
              <p className="text-sm font-bold capitalize">{channel.channel.replace('_', ' ')}</p>
              <p className="mt-2 text-2xl font-black">{formatMoney(channel.revenue)}</p>
              <p className="text-sm text-muted">{channel.orders} orders</p>
            </div>
          ))}
        </AsyncState>
      </div>
    </Card>
  );
}

function OperationalAnalyticsPanel() {
  const summary = useAnalyticsSummary();
  const data = summary.data;
  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold">Operational analytics</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MetricCard label="SLA breach rate" value={`${data?.slaMetrics.breachRate ?? 0}%`} detail={`${data?.slaMetrics.breachesToday ?? 0} breaches today`}>
          <Timer className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Queue latency" value={`${data?.slaMetrics.averageLatencyMinutes ?? 0}m`} detail="Average active order age">
          <Clock className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Consumption SKUs" value={String(data?.inventoryConsumptionTrends.length ?? 0)} detail="Inventory drawdown tracked">
          <PackageCheck className="size-5 text-royal" />
        </MetricCard>
      </div>
      <div className="mt-5 space-y-3">
        <AsyncState loading={summary.isLoading} error={summary.isError} empty={!data?.channelProfitability.length}>
          {data?.channelProfitability.map((row) => (
            <div key={row.channel} className="flex items-center justify-between rounded-lg border border-line p-3 text-sm">
              <span className="font-bold capitalize">{String(row.channel).replace('_', ' ')}</span>
              <span className="text-muted">{formatMoney(row.expectedPayout)} expected payout</span>
              <Badge className="bg-panel-muted text-muted ring-line">{row.marginPercent}% fees</Badge>
            </div>
          ))}
        </AsyncState>
      </div>
    </Card>
  );
}

function PayoutReconciliationPanel() {
  const queryClient = useQueryClient();
  const payouts = usePayoutReconciliation();
  const reconcile = useMutation({
    mutationFn: dashboardApi.reconcilePayouts,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payout-reconciliation'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    }
  });

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Payout reconciliation</h2>
        <Button size="sm" variant="secondary" onClick={() => reconcile.mutate()} disabled={reconcile.isPending}>
          {reconcile.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Reconcile
        </Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Expected" value={formatMoney(payouts.data?.totals.expected ?? 0)} detail={`${payouts.data?.totals.pending ?? 0} pending`}>
          <Activity className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Actual" value={formatMoney(payouts.data?.totals.actual ?? 0)} detail="Settled payouts">
          <PackageCheck className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Variance" value={formatMoney(payouts.data?.totals.variance ?? 0)} detail={`${payouts.data?.totals.variances ?? 0} exceptions`}>
          <AlertCircle className="size-5 text-royal" />
        </MetricCard>
      </div>
      <div className="mt-5 divide-y divide-line rounded-xl border border-line">
        <AsyncState loading={payouts.isLoading} error={payouts.isError} empty={!payouts.data?.rows.length}>
          {payouts.data?.rows.slice(0, 6).map((row) => (
            <div key={row.id} className="grid gap-2 p-3 text-sm md:grid-cols-[1fr_.8fr_.8fr]">
              <div>
                <p className="font-bold">{row.publicId}</p>
                <p className="text-xs text-muted">{row.outletName ?? 'Outlet'} - {row.channel.replace('_', ' ')}</p>
              </div>
              <p className="font-semibold">{formatMoney(row.expectedPayout)}</p>
              <Badge className={row.status === 'variance' ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-panel-muted text-muted ring-line'}>
                {row.status}
              </Badge>
            </div>
          ))}
        </AsyncState>
      </div>
    </Card>
  );
}

function WebhookEventPanel({ rows, loading, error }: { rows: Array<{ id: string; provider: string; eventType: string; status: string; createdAt: string; retryCount?: number; replayCount?: number; error?: string | null }>; loading: boolean; error: boolean }) {
  const queryClient = useQueryClient();
  const retry = useMutation({
    mutationFn: dashboardApi.retryWebhook,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
  const replay = useMutation({
    mutationFn: dashboardApi.replayWebhook,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
  const addNotification = useOpsStore((state) => state.addNotification);
  useEffect(() => {
    rows
      .filter((row) => row.status === 'failed' || row.status === 'rejected')
      .slice(0, 3)
      .forEach((row) =>
        addNotification({
          id: `webhook_recovery:${row.id}`,
          type: 'activity',
          title: 'Webhook recovery needed',
          detail: `${row.provider} ${row.eventType} is ${row.status}`,
          tone: row.status === 'rejected' ? 'critical' : 'warning',
          severity: row.status === 'rejected' ? 'critical' : 'error',
          actionLabel: 'Review webhook',
          actionUrl: '/dashboard/integrations'
        })
      );
  }, [addNotification, rows]);
  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold">Webhook event logs</h2>
      <div className="mt-4 divide-y divide-line rounded-xl border border-line">
        <AsyncState loading={loading} error={error} empty={!rows.length}>
          {rows.slice(0, 8).map((row) => (
            <div key={row.id} className="grid gap-2 p-3 text-sm md:grid-cols-[.8fr_1fr_.7fr_.8fr_.9fr]">
              <p className="font-bold capitalize">{row.provider.replace('_', ' ')}</p>
              <p className="text-muted">{row.eventType}</p>
              <Badge className={row.status === 'failed' || row.status === 'rejected' ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-panel-muted text-muted ring-line'}>
                {row.status}
              </Badge>
              <p className="text-muted">R{row.retryCount ?? 0} / P{row.replayCount ?? 0}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" disabled={retry.isPending || row.status === 'processed'} onClick={() => retry.mutate(row.id)}>Retry</Button>
                <Button size="sm" variant="ghost" disabled={replay.isPending} onClick={() => replay.mutate(row.id)}>Replay</Button>
              </div>
              <p className="text-muted">{formatDateTime(row.createdAt)}</p>
            </div>
          ))}
        </AsyncState>
      </div>
    </Card>
  );
}

function QueueActivityPanel({ rows, loading, error }: { rows: Array<{ id: string; queue: string; jobName: string; status: string; detail: string; createdAt: string }>; loading: boolean; error: boolean }) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold">Queue and job activity</h2>
      <div className="mt-4 divide-y divide-line rounded-xl border border-line">
        <AsyncState loading={loading} error={error} empty={!rows.length}>
          {rows.slice(0, 10).map((row) => (
            <div key={row.id} className="grid gap-2 p-3 text-sm md:grid-cols-[.8fr_.8fr_1.3fr_.7fr]">
              <p className="font-bold">{row.jobName}</p>
              <Badge className={row.status === 'failed' ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-panel-muted text-muted ring-line'}>
                {row.status}
              </Badge>
              <p className="text-muted">{row.detail}</p>
              <p className="text-muted">{formatDateTime(row.createdAt)}</p>
            </div>
          ))}
        </AsyncState>
      </div>
    </Card>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span className="text-sm font-semibold text-muted">Page {page} of {totalPages}</span>
      <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </div>
  );
}

function AsyncState({ loading, error, empty, children }: { loading: boolean; error: boolean; empty?: boolean; children: React.ReactNode }) {
  if (loading) return <LoadingRows />;
  if (error) return <ErrorState />;
  if (empty) return <EmptyState />;
  return <>{children}</>;
}

function AsyncTableState({ loading, error, empty, children }: { loading: boolean; error: boolean; empty?: boolean; children: React.ReactNode }) {
  if (loading) return <div className="p-5"><LoadingRows /></div>;
  if (error) return <div className="p-5"><ErrorState /></div>;
  if (empty) return <div className="p-5"><EmptyState /></div>;
  return <>{children}</>;
}

function AsyncChartState({ loading, error, empty, children }: { loading: boolean; error: boolean; empty?: boolean; children: React.ReactNode }) {
  if (loading) return <Skeleton className="h-full w-full" />;
  if (error) return <ErrorState />;
  if (empty) return <EmptyState />;
  return <>{children}</>;
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-3/4" />
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      <span className="flex items-center gap-2">
        <AlertCircle className="size-4" />
        Could not load live data.
      </span>
      <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  );
}

function EmptyState() {
  return <div className="rounded-xl border border-line bg-panel-muted p-4 text-sm font-semibold text-muted">No operational data found.</div>;
}

function formatKpiValue(value: number, unit: string) {
  if (unit === 'currency') return formatMoney(value);
  if (unit === 'minutes') return `${value}m`;
  if (unit === 'percent') return `${value}%`;
  return new Intl.NumberFormat('en-IN').format(value);
}

function actionCopy(status: OrderStatus) {
  if (status === 'accepted') return 'Accept';
  if (status === 'preparing') return 'Start prep';
  if (status === 'dispatched') return 'Dispatch';
  if (status === 'delivered') return 'Deliver';
  if (status === 'cancelled') return 'Cancel';
  return statusCopy[status];
}

function timestampPatch(status: OrderStatus, value: string): Partial<Order> {
  if (status === 'accepted') return { acceptedAt: value };
  if (status === 'preparing') return { preparingAt: value };
  if (status === 'dispatched') return { dispatchedAt: value };
  if (status === 'delivered') return { deliveredAt: value };
  if (status === 'cancelled') return { cancelledAt: value };
  return {};
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function getMutationErrorMessage(error: unknown) {
  return getApiErrorMessage(error);
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function getSlaState(order: Order, now: number) {
  if (order.status === 'delivered' || order.status === 'cancelled') {
    return { level: 'green' as const, remainingMs: 0, minutes: 0 };
  }

  const placedAt = Date.parse(order.placedAt);
  if (Number.isNaN(placedAt)) {
    return { level: 'green' as const, remainingMs: order.etaMinutes * 60_000, minutes: order.etaMinutes };
  }

  const dueAt = placedAt + order.etaMinutes * 60_000;
  const remainingMs = dueAt - now;
  const minutes = Math.ceil(Math.abs(remainingMs) / 60_000);
  const remainingRatio = remainingMs / Math.max(order.etaMinutes * 60_000, 1);
  const level = remainingMs <= 0 ? 'red' : remainingRatio <= 0.25 ? 'yellow' : 'green';
  return { level, remainingMs, minutes };
}

function inventoryTone(risk: InventoryItem['risk']) {
  if (risk === 'critical') return 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-800';
  if (risk === 'warning') return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800';
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800';
}

function notificationTone(tone: OperationsNotification['tone']) {
  if (tone === 'critical') return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200';
  if (tone === 'warning') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200';
  if (tone === 'success') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200';
  return 'bg-panel-muted text-muted';
}

function outletsFromOrders(orders: Order[]) {
  return Array.from(
    new Map(
      orders.map((order) => [
        order.outletId,
        {
          id: order.outletId,
          name: order.outletName,
          city: order.outletCity
        }
      ])
    ).values()
  );
}
