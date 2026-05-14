'use client';

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
import { Activity, ArrowUpRight, Clock, PackageCheck } from 'lucide-react';
import { Badge, Button, Card, MetricCard, SearchInput } from '@kitchenflow/ui';
import { integrations, kpis, menuItems, outletComparison, revenueSeries } from '@/lib/data';
import { useOpsStore } from '@/store/ops-store';
import { formatMoney, percentage, statusCopy, statusTone } from '@kitchenflow/utils';
import type { OrderStatus } from '@kitchenflow/types';

const statusFilters: Array<OrderStatus | 'all'> = ['all', 'pending', 'accepted', 'preparing', 'dispatched', 'delivered', 'cancelled'];

export function OverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Command center" title="Live restaurant commerce operations" action="Export report" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
            <MetricCard label={kpi.label} value={kpi.value} detail={`${percentage(kpi.delta)} vs last week`}>
              <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-royal">
                <ArrowUpRight className="size-5" />
              </span>
            </MetricCard>
          </motion.div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]">
        <RevenuePanel />
        <LiveOrderFeed />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <IntegrationsPanel />
        <InventoryRiskPanel />
        <OutletPanel />
      </div>
    </div>
  );
}

export function OrdersPage() {
  const { orders, query, status, setQuery, setStatus, advanceOrder } = useOpsStore();
  const filtered = orders.filter((order) => {
    const matchesStatus = status === 'all' || order.status === status;
    const matchesQuery = [order.publicId, order.customerName, order.outletName, order.channel].join(' ').toLowerCase().includes(query.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Order management" title="Kitchen workflow and delivery tracking" action="Create manual order" />
      <Card className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search orders or customers" />
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <Button key={filter} variant={status === filter ? 'primary' : 'secondary'} size="sm" onClick={() => setStatus(filter)}>
                {filter === 'all' ? 'All' : statusCopy[filter]}
              </Button>
            ))}
          </div>
        </div>
      </Card>
      <Card className="overflow-hidden">
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
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-surface">
                  <td className="px-5 py-4 font-bold text-ink">{order.publicId}</td>
                  <td className="px-5 py-4 capitalize text-muted">{order.channel.replace('_', ' ')}</td>
                  <td className="px-5 py-4">{order.customerName}</td>
                  <td className="px-5 py-4">{order.outletName}</td>
                  <td className="px-5 py-4">{order.etaMinutes} min</td>
                  <td className="px-5 py-4 font-semibold">{formatMoney(order.total.amount)}</td>
                  <td className="px-5 py-4">
                    <Badge className={statusTone[order.status]}>{statusCopy[order.status]}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Button size="sm" variant="secondary" onClick={() => advanceOrder(order.id)}>
                      Advance
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function MenusPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Menu management" title="Pricing, availability, variants, and outlet scopes" action="Bulk sync" />
      <div className="grid gap-4 lg:grid-cols-3">
        {menuItems.map((item) => (
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
            <p className="mt-4 text-2xl font-black">{formatMoney(item.price.amount)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.variants.map((variant) => (
                <Badge key={variant} className="bg-slate-50 text-slate-700 ring-line">{variant}</Badge>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">{item.outletScope.join(', ')}</p>
          </Card>
        ))}
      </div>
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
      <div className="grid gap-3 md:grid-cols-7">
        {Array.from({ length: 42 }).map((_, index) => (
          <div
            key={index}
            className="h-16 rounded-xl border border-line bg-white p-2"
            style={{ backgroundColor: `rgba(36, 107, 254, ${0.08 + (index % 6) * 0.08})` }}
          >
            <span className="text-xs font-bold text-ink">{index % 24}:00</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Integration marketplace" title="Aggregator, POS, accounting, and webhook health" action="Add connector" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((integration) => (
          <Card key={integration.id} className="p-5">
            <div className="flex items-center justify-between">
              <div className="grid size-12 place-items-center rounded-xl bg-ink text-sm font-black text-white">
                {integration.label.slice(0, 2).toUpperCase()}
              </div>
              <Badge className="bg-blue-50 text-blue-700 ring-blue-200">{integration.status}</Badge>
            </div>
            <h3 className="mt-5 text-xl font-black">{integration.label}</h3>
            <p className="mt-2 text-sm text-muted">Last sync {integration.lastSync}. Webhook delivery health at {integration.webhookHealth}%.</p>
            <div className="mt-5 h-2 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-royal" style={{ width: `${integration.webhookHealth}%` }} />
            </div>
          </Card>
        ))}
      </div>
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
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Revenue and order trend</h2>
          <p className="text-sm text-muted">Live GMV across aggregators and direct channels</p>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">+14.8%</Badge>
      </div>
      <div className="mt-5 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revenueSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6e9f1" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Area dataKey="revenue" stroke="#246bfe" fill="#dbeafe" strokeWidth={3} />
            <Area dataKey="orders" stroke="#28d7ef" fill="#cffafe" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function LiveOrderFeed() {
  const orders = useOpsStore((state) => state.orders.slice(0, 5));
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Live order feed</h2>
        <Clock className="size-5 text-royal" />
      </div>
      <div className="mt-5 space-y-3">
        {orders.map((order) => (
          <motion.div layout key={order.id} className="rounded-xl border border-line p-4">
            <div className="flex items-center justify-between">
              <p className="font-bold">{order.publicId}</p>
              <Badge className={statusTone[order.status]}>{statusCopy[order.status]}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              {order.customerName} · {order.outletName} · {formatMoney(order.total.amount)}
            </p>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

function IntegrationsPanel() {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold">Sync states</h2>
      <div className="mt-4 space-y-3">
        {integrations.slice(0, 4).map((item) => (
          <div key={item.id} className="flex items-center justify-between">
            <span className="font-semibold">{item.label}</span>
            <Badge className="bg-slate-50 text-slate-700 ring-line">{item.status}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function InventoryRiskPanel() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Inventory risk</h2>
        <PackageCheck className="size-5 text-royal" />
      </div>
      <div className="mt-5 space-y-4">
        {['Paneer cubes', 'Millet base', 'Blueberry kefir'].map((item, index) => (
          <div key={item}>
            <div className="flex justify-between text-sm font-semibold">
              <span>{item}</span>
              <span>{[18, 34, 8][index]}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-royal" style={{ width: `${[18, 34, 8][index]}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function OutletPanel() {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold">Outlet comparison</h2>
      <div className="mt-5 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={outletComparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6e9f1" />
            <XAxis dataKey="outlet" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="revenue" fill="#246bfe" radius={[6, 6, 0, 0]} />
            <Bar dataKey="uptime" fill="#28d7ef" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
