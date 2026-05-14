'use client';

import { useState } from 'react';
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
import { Activity, AlertCircle, ArrowUpRight, Clock, Loader2, PackageCheck } from 'lucide-react';
import { Badge, Button, Card, MetricCard, SearchInput, Skeleton } from '@kitchenflow/ui';
import type { Channel, Order, OrderStatus } from '@kitchenflow/types';
import { formatMoney, percentage, statusCopy, statusTone } from '@kitchenflow/utils';
import { useAuth } from '@/components/auth/auth-provider';
import { dashboardApi } from '@/lib/dashboard-api';
import { useAnalyticsSummary, useIntegrations, useInventory, useMenus, useOrders } from '@/hooks/use-dashboard-data';

const statusFilters: Array<OrderStatus | 'all'> = ['all', 'pending', 'accepted', 'preparing', 'dispatched', 'delivered', 'cancelled'];
const channelFilters: Array<Channel | 'all'> = ['all', 'swiggy', 'zomato', 'uber_eats', 'deliveroo'];
const flow: OrderStatus[] = ['pending', 'accepted', 'preparing', 'dispatched', 'delivered'];

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
  const [page, setPage] = useState(1);
  const orders = useOrders({ page, limit: 12, status, channel, query });
  const queryClient = useQueryClient();
  const updateStatus = useMutation({
    mutationFn: ({ orderId, nextStatus }: { orderId: string; nextStatus: OrderStatus }) => dashboardApi.updateOrderStatus(orderId, nextStatus),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    }
  });

  function advanceOrder(order: Order) {
    const nextStatus = flow[Math.min(flow.indexOf(order.status) + 1, flow.length - 1)] ?? order.status;
    updateStatus.mutate({ orderId: order.id, nextStatus });
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Order management" title="Kitchen workflow and delivery tracking" action="Create manual order" />
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
      <Card className="overflow-hidden">
        <AsyncTableState loading={orders.isLoading} error={orders.isError} empty={!orders.data?.items.length}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  {['Order', 'Channel', 'Customer', 'Outlet', 'SLA', 'Total', 'Status', 'Action'].map((head) => (
                    <th key={head} className="px-5 py-4 font-bold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {orders.data?.items.map((order) => (
                  <tr key={order.id} className="hover:bg-surface">
                    <td className="px-5 py-4 font-bold text-ink">{order.publicId}</td>
                    <td className="px-5 py-4 capitalize text-muted">{order.channel.replace('_', ' ')}</td>
                    <td className="px-5 py-4">{order.customerName}</td>
                    <td className="px-5 py-4">{order.outletName}</td>
                    <td className="px-5 py-4">{order.etaMinutes} min</td>
                    <td className="px-5 py-4 font-semibold">{formatMoney(order.total.amount, order.total.currency)}</td>
                    <td className="px-5 py-4">
                      <Badge className={statusTone[order.status]}>{statusCopy[order.status]}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Button size="sm" variant="secondary" onClick={() => advanceOrder(order)} disabled={updateStatus.isPending || order.status === 'delivered'}>
                        {updateStatus.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                        Advance
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
    </div>
  );
}

export function MenusPage() {
  const menus = useMenus();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Menu management" title="Pricing, availability, variants, and outlet scopes" action="Bulk sync" />
      <AsyncState loading={menus.isLoading} error={menus.isError} empty={!menus.data?.length}>
        <div className="grid gap-4 lg:grid-cols-3">
          {menus.data?.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-royal">{item.category}</p>
                  <h3 className="mt-2 text-lg font-bold">{item.name}</h3>
                </div>
                <button className={`h-6 w-11 rounded-full p-1 transition ${item.available ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-label="Toggle availability">
                  <span className={`block size-4 rounded-full bg-white transition ${item.available ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <p className="mt-4 text-2xl font-black">{formatMoney(item.price.amount, item.price.currency)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.variants.map((variant) => (
                  <Badge key={variant} className="bg-slate-50 text-slate-700 ring-line">{variant}</Badge>
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
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <RevenuePanel />
        <OutletPanel />
      </div>
      <ChannelPanel />
    </div>
  );
}

export function IntegrationsPage() {
  const integrations = useIntegrations();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Integration marketplace" title="Aggregator, POS, accounting, and webhook health" action="Add connector" />
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
              <div className="mt-5 h-2 rounded-full bg-slate-100">
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
  const [outletId, setOutletId] = useState(user?.restaurant.outlets[0]?.id);
  const inventory = useInventory(outletId);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Inventory" title="Stock intelligence and outlet replenishment" action="Configure" />
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {user?.restaurant.outlets.map((outlet) => (
            <Button key={outlet.id} variant={outletId === outlet.id ? 'primary' : 'secondary'} size="sm" onClick={() => setOutletId(outlet.id)}>
              {outlet.name}
            </Button>
          ))}
        </div>
      </Card>
      <AsyncState loading={inventory.isLoading} error={inventory.isError} empty={!inventory.data?.items.length}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {inventory.data?.items.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-royal">{item.sku}</p>
                  <h3 className="mt-2 text-lg font-bold">{item.name}</h3>
                </div>
                <Badge className={item.risk === 'critical' ? 'bg-rose-50 text-rose-700 ring-rose-200' : item.risk === 'warning' ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}>
                  {item.risk}
                </Badge>
              </div>
              <p className="mt-4 text-2xl font-black">{item.quantity} {item.unit}</p>
              <p className="mt-1 text-sm text-muted">Reorder at {item.reorderAt} {item.unit}</p>
              <div className="mt-5 h-2 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-royal" style={{ width: `${item.stockPercent}%` }} />
              </div>
            </Card>
          ))}
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

function PageHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action: string }) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-royal">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
      </div>
      <Button>{action}</Button>
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
        <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">polling 30s</Badge>
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
              <Badge className="bg-slate-50 text-slate-700 ring-line">{item.status}</Badge>
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
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-royal" style={{ width: `${item.stockPercent}%` }} />
              </div>
            </div>
          ))}
        </AsyncState>
      </div>
    </Card>
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
            <div key={channel.channel} className="rounded-xl border border-line p-4">
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
    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
      <AlertCircle className="size-4" />
      Could not load live data.
    </div>
  );
}

function EmptyState() {
  return <div className="rounded-xl border border-line bg-slate-50 p-4 text-sm font-semibold text-muted">No operational data found.</div>;
}

function formatKpiValue(value: number, unit: string) {
  if (unit === 'currency') return formatMoney(value);
  if (unit === 'minutes') return `${value}m`;
  if (unit === 'percent') return `${value}%`;
  return new Intl.NumberFormat('en-IN').format(value);
}
