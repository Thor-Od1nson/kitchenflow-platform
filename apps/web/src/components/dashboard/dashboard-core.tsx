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
import { Activity, AlertCircle, ArrowUpRight, Bell, Clock, Eye, Loader2, Minus, PackageCheck, Plus, ShoppingCart, Timer } from 'lucide-react';
import { Badge, Button, Card, Input, MetricCard, ModalFrame, SearchInput, Skeleton } from '@kitchenflow/ui';
import type { Channel, InventoryItem, MenuItem, OperationalActivity, OperationsNotification, Order, OrderStatus, PaginatedResponse } from '@kitchenflow/types';
import { formatMoney, percentage, statusCopy, statusTone } from '@kitchenflow/utils';
import { useAuth } from '@/components/auth/auth-provider';
import { dashboardApi, type CreateOrderInput } from '@/lib/dashboard-api';
import { getApiErrorMessage } from '@/lib/api-client';
import { useActivity, useAnalyticsSummary, useAudit, useIntegrations, useInventory, useMenus, useOrders } from '@/hooks/use-dashboard-data';
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
      <PageHeader eyebrow="Command center" title="Live restaurant commerce operations" action="Export report" />
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
  loading,
  onCreate,
  onClose
}: {
  outlets: Array<{ id: string; name: string; city: string }>;
  menus: MenuItem[];
  loading: boolean;
  onCreate: (input: CreateOrderInput) => void;
  onClose: () => void;
}) {
  const defaultOutletId = outlets[0]?.id ?? '';
  const defaultMenuId = menus[0]?.id ?? '';
  const [outletId, setOutletId] = useState(defaultOutletId);
  const [channel, setChannel] = useState<Channel>('direct');
  const [customerName, setCustomerName] = useState('');
  const [etaMinutes, setEtaMinutes] = useState(25);
  const [clientMutationId] = useState(() => `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [lines, setLines] = useState<Array<{ menuItemId: string; quantity: number }>>([{ menuItemId: defaultMenuId, quantity: 1 }]);
  useEffect(() => {
    if (!outletId && defaultOutletId) setOutletId(defaultOutletId);
    if (defaultMenuId) {
      setLines((current) => current.map((line) => (line.menuItemId ? line : { ...line, menuItemId: defaultMenuId })));
    }
  }, [defaultMenuId, defaultOutletId, outletId]);

  const total = lines.reduce((sum, line) => {
    const item = menus.find((menu) => menu.id === line.menuItemId);
    return sum + (item?.price.amount ?? 0) * line.quantity;
  }, 0);

  function submit() {
    const items = lines.filter((line) => line.menuItemId && line.quantity > 0);
    if (!outletId || !customerName.trim() || !items.length) return;
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
            <Button size="sm" variant="secondary" onClick={() => setLines((current) => [...current, { menuItemId: menus[0]?.id ?? '', quantity: 1 }])}>
              <Plus className="size-4" />
              Add
            </Button>
          </div>
          {lines.map((line, index) => (
            <div key={`${line.menuItemId}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_88px_40px]">
              <select
                className="h-10 rounded-xl border border-line bg-panel px-3 text-sm text-ink"
                value={line.menuItemId}
                onChange={(event) =>
                  setLines((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, menuItemId: event.target.value } : item)))
                }
              >
                {menus.map((item) => (
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
          <Button onClick={submit} disabled={loading || !customerName.trim() || !lines.some((line) => line.menuItemId)}>
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
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Menu management" title="Pricing, availability, variants, and outlet scopes" action={canManageMenus ? 'Bulk sync' : undefined} />
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
                  <button className={`h-6 w-11 rounded-full p-1 transition ${item.available ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-label="Toggle availability">
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
      <PageHeader eyebrow="Analytics" title="Revenue, conversion, heatmaps, and outlet performance" action="Schedule digest" />
      <KitchenPerformancePanel />
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <RevenuePanel />
        <OutletPanel />
      </div>
      <ChannelPanel />
    </div>
  );
}

export function IntegrationsPage() {
  const { user } = useAuth();
  const integrations = useIntegrations();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Integration marketplace" title="Aggregator, POS, accounting, and webhook health" action={user?.role === 'owner' ? 'Add connector' : undefined} />
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
      <PageHeader eyebrow="Inventory" title="Stock intelligence and outlet replenishment" action={canAdjustInventory ? 'Sync stock' : undefined} />
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
      <PageHeader eyebrow={eyebrow} title={title} action="Configure" />
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
  const activity = useActivity();
  const activityNotifications = (activity.data ?? []).map(activityToNotification);
  const rows = [...notifications, ...activityNotifications].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Notifications" title="Operational alerts and incident routing" action="Clear" onAction={clearNotifications} />
      <Card className="overflow-hidden">
        <AsyncTableState loading={activity.isLoading} error={activity.isError} empty={!rows.length}>
          <div className="divide-y divide-line">
            {rows.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} />
            ))}
          </div>
        </AsyncTableState>
      </Card>
    </div>
  );
}

export function AuditPage() {
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('all');
  const [page, setPage] = useState(1);
  const audit = useAudit({ page, limit: 20, query, action });

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

function PageHeader({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-royal">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
      </div>
      {action ? <Button onClick={onAction}>{action}</Button> : null}
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
