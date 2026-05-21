'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, PlugZap, ShieldCheck, Sparkles, Utensils } from 'lucide-react';
import { Button, Card } from '@kitchenflow/ui';
import { integrations, kpis, orders, revenueSeries } from '@/lib/data';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatMoney, statusCopy, statusTone } from '@kitchenflow/utils';

const brands = ['Birch & Bowl', 'Northstar Foods', 'Nori Cloud', 'Mesa Kitchen', 'Urban Deli'];
const features = [
  {
    title: 'Aggregator command center',
    copy: 'Accept, throttle, pause, and reconcile orders across Swiggy, Zomato, DoorDash, Talabat, and more.',
    Icon: PlugZap
  },
  {
    title: 'Enterprise guardrails',
    copy: 'JWT auth, RBAC, audit trails, rate limiting, tenant isolation, and franchise-safe permissions.',
    Icon: ShieldCheck
  },
  {
    title: 'Real-time growth analytics',
    copy: 'Revenue, heatmaps, prep time, menu conversion, stock risk, and outlet comparisons update live.',
    Icon: Sparkles
  }
];

export function LandingPage() {
  return (
    <main className="bg-white">
      <section className="noise relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(99,91,255,.42),transparent_60%)]" />
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3 font-bold">
            <span className="grid size-9 place-items-center rounded-xl bg-white text-ink">
              <Utensils className="size-5" />
            </span>
            KitchenFlow
          </div>
          <div className="hidden items-center gap-7 text-sm font-medium text-slate-300 md:flex">
            <a href="#features">Platform</a>
            <a href="#integrations">Integrations</a>
            <a href="#pricing">Pricing</a>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal"
          >
            Login
          </Link>
        </nav>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-16 pt-16 lg:grid-cols-[.95fr_1.05fr] lg:pb-24 lg:pt-24">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-semibold text-cyan-100">
              Restaurant commerce infrastructure for multi-brand operators
            </p>
            <h1 className="mt-7 max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
              Manage all your online food operations from one powerful platform
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Sync menus, route live orders, reconcile aggregator payouts, monitor stock, and operate every outlet
              with real-time command center clarity.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="bg-white text-ink hover:bg-cyan-50">
                Book a demo <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="secondary" className="border-white/15 bg-white/10 text-white hover:bg-white/15">
                View live dashboard
              </Button>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4">
              {kpis.map((kpi) => (
                <div key={kpi.label}>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-slate-400">{kpi.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="relative"
          >
            <div className="absolute -left-8 top-14 hidden rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-xl lg:block">
              <div className="flex gap-2">
                {integrations.slice(0, 4).map((item) => (
                  <span key={item.id} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-ink">
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
            <Card className="overflow-hidden border-white/10 bg-white/95 shadow-glow">
              <div className="border-b border-line bg-slate-50 px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-ink">Live operations</p>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                    98.9% sync health
                  </span>
                </div>
              </div>
              <div className="grid gap-0 lg:grid-cols-[1fr_.85fr]">
                <div className="p-5">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueSeries}>
                        <defs>
                          <linearGradient id="heroRevenue" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#246bfe" stopOpacity={0.42} />
                            <stop offset="100%" stopColor="#28d7ef" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <Tooltip />
                        <Area dataKey="revenue" stroke="#246bfe" fill="url(#heroRevenue)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {['Order SLA', 'Stock risk', 'Payout drift'].map((label, index) => (
                      <div key={label} className="rounded-xl bg-surface p-3">
                        <p className="text-xs text-muted">{label}</p>
                        <p className="mt-1 font-bold text-ink">{['94%', '12 SKUs', '0.8%'][index]}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-line p-5 lg:border-l lg:border-t-0">
                  <p className="text-sm font-bold text-ink">Incoming orders</p>
                  <div className="mt-4 space-y-3">
                    {orders.map((order, index) => (
                      <motion.div
                        key={order.id}
                        animate={{ y: [0, index === 0 ? -4 : 0, 0] }}
                        transition={{ duration: 3, repeat: Infinity, delay: index * 0.2 }}
                        className="rounded-xl border border-line bg-white p-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-ink">{order.publicId}</p>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-bold ring-1 ${statusTone[order.status]}`}>
                            {statusCopy[order.status]}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {order.outletName} · {formatMoney(order.total.amount)}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-center gap-x-10 gap-y-4 px-6 pb-10 text-sm font-semibold text-slate-400">
          {brands.map((brand) => (
            <span key={brand}>{brand}</span>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="font-bold text-royal">Operating system</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-ink">Every channel, menu, outlet, and order in one control plane.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {features.map(({ title, copy, Icon }) => (
            <Card key={title} className="p-6">
              <Icon className="size-6 text-royal" />
              <h3 className="mt-5 text-xl font-bold text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            ['Product showcase', 'Menu publishing, order routing, stock alerts, aggregator sync, and incident response share one operational model.'],
            ['Testimonials', '“KitchenFlow gave our ops team one trusted source of truth across 61 outlets and six delivery channels.”'],
            ['FAQ', 'Supports multi-brand tenancy, POS connectors, custom webhooks, role-based approvals, and dedicated enterprise onboarding.']
          ].map(([title, copy]) => (
            <Card key={title} className="p-6">
              <h3 className="text-xl font-black text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="integrations" className="bg-surface py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="font-bold text-royal">Integrations</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-ink">Certified connections for the channels restaurants actually run.</h2>
            </div>
            <Button variant="secondary">Explore marketplace</Button>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {integrations.map((integration) => (
              <Card key={integration.id} className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-ink">{integration.label}</p>
                  <CheckCircle2 className="size-5 text-emerald-500" />
                </div>
                <p className="mt-2 text-sm text-muted">Webhook health {integration.webhookHealth}% · {integration.lastSync}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="font-bold text-royal">Enterprise ready</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-ink">Built for serious food operators.</h2>
            <p className="mt-4 text-muted">Dedicated onboarding, sandbox APIs, menu migration, custom POS connectors, and 24/7 incident support.</p>
          </div>
          <Card className="p-8">
            <div className="grid gap-5 md:grid-cols-2">
              {['Multi-tenant RBAC', 'Outlet-level controls', 'Payout reconciliation', 'Inventory forecasting', 'SLA monitoring', 'Webhook observability'].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm font-semibold text-ink">
                  <CheckCircle2 className="size-5 text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button>Talk to sales</Button>
              <Button variant="secondary">Read security brief</Button>
            </div>
          </Card>
        </div>
      </section>
      <footer className="border-t border-line bg-ink px-6 py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row md:items-center">
          <p className="font-black">KitchenFlow</p>
          <p className="text-sm text-slate-400">Restaurant commerce infrastructure for modern operators.</p>
        </div>
      </footer>
    </main>
  );
}
