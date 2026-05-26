'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { ArrowRight, CheckCircle2, Globe2, PlugZap, ShieldCheck, Sparkles, Truck, Utensils } from 'lucide-react';
import { Button, Card } from '@kitchenflow/ui';
import { integrations, revenueSeries } from '@/lib/data';

const brands = ['Jumeirah Group', 'Dubai Marina Kitchens', 'Yas Cloud Dining', 'Riyadh Prime Foods', 'Marina Deli'];
const features = [
  {
    title: 'Aggregator command center',
    copy: 'Control Talabat, Deliveroo, Careem, Noon, Jahez, and direct channels from one audited operating layer.',
    Icon: PlugZap
  },
  {
    title: 'GCC enterprise guardrails',
    copy: 'RBAC, audit logs, outlet-level permissions, webhook recovery, and franchise-safe workflows for regional scale.',
    Icon: ShieldCheck
  },
  {
    title: 'Delivery operations control',
    copy: 'Track SLA risk, prep latency, payout variance, stock exposure, and outlet health with live operating signals.',
    Icon: Sparkles
  }
];
const heroStats = [
  { value: 'AED 387k', label: 'modeled GMV coverage' },
  { value: '94%', label: 'SLA scenario health' },
  { value: '12', label: 'risk categories' }
];
const previewMetrics = [
  { value: '8', label: 'regional workspaces' },
  { value: '6', label: 'aggregator lanes' },
  { value: '24/7', label: 'command visibility' },
  { value: '99.97%', label: 'modeled sync uptime' }
];
const previewWorkflows = [
  ['Aggregator orchestration', 'Deliveroo, Talabat, Careem, Noon Food, HungerStation, Jahez, and Business Central lanes.'],
  ['Regional operations', 'Dubai Marina, Abu Dhabi Yas, Riyadh Olaya, Doha West Bay, and Jeddah Corniche visibility.'],
  ['Enterprise governance', 'Role-aware escalation, audit posture, payout readiness, and SLA scenario modeling.'],
  ['Fulfillment resilience', 'Previewed order pressure, stock exposure, dispatch latency, and command center handoffs.']
];
const intelligenceModules = [
  ['Dispatch control', 'Forecast SLA pressure, recommend runner allocation, and surface prep bottlenecks before dinner surge.'],
  ['Multi-brand orchestration', 'Segment cloud kitchen brands, franchise regions, outlet groups, and aggregator permissions without losing HQ visibility.'],
  ['Omnichannel operations', 'Unify marketplace orders, direct ordering, POS sync, webhooks, inventory, and payout reconciliation in one workflow.'],
  ['Delivery reliability', 'Track regional throughput, delivery radius stress, cancellations, courier latency, and outlet-level fulfillment reliability.']
];
const automationPlaybooks = [
  ['Predict demand', 'Forecast SKU pressure by region, hour, and delivery channel before the rush starts.'],
  ['Balance kitchens', 'Move prep capacity across cloud kitchens and brands when SLA confidence drops.'],
  ['Escalate incidents', 'Route webhooks, payout variance, courier wait, and stock risks to the right team.']
];

export function LandingPage() {
  return (
    <main className="noise min-h-screen bg-surface text-ink">
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(39,232,166,.18),transparent_62%)]" />
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3 font-black">
            <span className="grid size-10 place-items-center rounded-xl bg-royal text-slate-950 shadow-soft">
              <Utensils className="size-5" />
            </span>
            <span>KitchenFlow</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm font-semibold text-muted md:flex">
            <a href="#platform">Platform</a>
            <a href="#integrations">Integrations</a>
            <a href="#enterprise">Enterprise</a>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-panel/70 px-4 text-sm font-semibold text-ink transition hover:border-royal/50 hover:bg-panel-muted"
          >
            Login
          </Link>
        </nav>

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 pb-10 pt-12 lg:grid-cols-[.9fr_1.1fr] lg:pb-16 lg:pt-20">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
            <p className="inline-flex rounded-full border border-royal/25 bg-royal/10 px-3 py-1 text-sm font-bold text-royal">
              KitchenFlow GCC Enterprise Preview
            </p>
            <h1 className="mt-7 max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
              Delivery operations for premium GCC food brands.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              A live command platform for multi-brand kitchens, aggregators, inventory, payouts, and outlet reliability
              across Dubai, Abu Dhabi, Riyadh, and beyond.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg">
                Request enterprise walkthrough <ArrowRight className="size-4" />
              </Button>
              <Link href="/login">
                <Button size="lg" variant="secondary">
                  Open command center
                </Button>
              </Link>
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {previewMetrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-line bg-panel/70 p-4">
                  <p className="text-2xl font-black">{metric.value}</p>
                  <p className="mt-1 text-xs font-semibold text-muted">{metric.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.65 }}
            className="relative"
          >
            <Card className="overflow-hidden">
              <div className="border-b border-line bg-panel-muted/70 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-royal">Enterprise preview</p>
                    <p className="mt-1 text-xl font-black">Dubai revenue and SLA desk</p>
                  </div>
                  <div className="flex max-w-full flex-wrap items-center gap-2">
                    <span className="inline-flex h-7 items-center whitespace-nowrap rounded-full border border-royal/25 bg-royal/10 px-3 text-xs font-bold leading-none text-royal">
                      PREVIEW - 8 workspaces
                    </span>
                    <span className="inline-flex h-7 items-center whitespace-nowrap rounded-full border border-line bg-panel px-3 text-xs font-bold leading-none text-muted">
                      99.97% modeled sync
                    </span>
                    <span className="inline-flex h-7 items-center whitespace-nowrap rounded-full border border-line bg-panel px-3 text-xs font-bold leading-none text-muted">
                      6 aggregator lanes
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid gap-0 xl:grid-cols-[1fr_340px]">
                <div className="p-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {heroStats.map((stat) => (
                      <div key={stat.label} className="rounded-xl border border-line bg-panel-muted/60 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted">{stat.label}</p>
                        <p className="mt-1 text-xl font-black">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueSeries}>
                        <defs>
                          <linearGradient id="heroRevenue" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#27e8a6" stopOpacity={0.34} />
                            <stop offset="100%" stopColor="#27e8a6" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#899994', fontSize: 12 }} />
                        <Tooltip contentStyle={{ background: '#0a1012', border: '1px solid #23302d', borderRadius: 12 }} />
                        <Area dataKey="revenue" stroke="#27e8a6" fill="url(#heroRevenue)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="border-t border-line p-5 xl:border-l xl:border-t-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">Preview control scope</p>
                    <Truck className="size-5 text-royal" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {previewWorkflows.map(([title, copy], index) => (
                      <motion.div
                        key={title}
                        animate={{ y: [0, index === 0 ? -4 : 0, 0] }}
                        transition={{ duration: 3, repeat: Infinity, delay: index * 0.18 }}
                        className="rounded-xl border border-line bg-panel-muted/60 p-3"
                      >
                        <p className="text-sm font-bold">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted">{copy}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-wrap items-center gap-x-10 gap-y-4 px-6 pb-12 text-sm font-semibold text-muted">
          {brands.map((brand) => (
            <span key={brand}>{brand}</span>
          ))}
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="font-bold text-royal">Operating system</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">Built for funded food operators, cloud kitchens, and franchise groups.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {features.map(({ title, copy, Icon }) => (
            <Card key={title} className="p-6">
              <Icon className="size-6 text-royal" />
              <h3 className="mt-5 text-xl font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <Card className="overflow-hidden p-6">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-royal">Preview logistics model</p>
                <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight">Built around the moment an order becomes operational risk.</h2>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-royal/25 bg-royal/10 px-3 py-1 text-xs font-bold text-royal">
                <span className="live-pulse size-1.5 rounded-full bg-royal" />
                Preview GCC desk
              </span>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {intelligenceModules.map(([title, copy]) => (
                <div key={title} className="rounded-xl border border-line bg-panel-muted/55 p-4">
                  <h3 className="font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-royal">Operations showcase</p>
            <div className="mt-5 space-y-4">
              {[
                ['Dubai Marina', '96% SLA', '18m dispatch'],
                ['Business Bay', '93% SLA', '21m dispatch'],
                ['Abu Dhabi Yas', '89% SLA', '24m dispatch']
              ].map(([region, sla, latency]) => (
                <div key={region} className="rounded-xl border border-line bg-panel-muted/55 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-black">{region}</p>
                    <span className="text-sm font-bold text-royal">{sla}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-muted">{latency} - active dinner window</p>
                  <div className="mt-3 h-2 rounded-full bg-panel">
                    <div className="h-full rounded-full bg-gradient-to-r from-royal to-cyan" style={{ width: sla }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section id="integrations" className="mx-auto max-w-7xl px-6 pb-20">
        <Card className="overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[.8fr_1.2fr]">
            <div className="border-b border-line p-8 lg:border-b-0 lg:border-r">
              <Globe2 className="size-7 text-royal" />
              <h2 className="mt-5 text-3xl font-black">Certified UAE delivery stack.</h2>
              <p className="mt-4 text-sm leading-6 text-muted">
                Keep every marketplace, POS, accounting bridge, and webhook lane visible with health telemetry and recovery controls.
              </p>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-2">
              {integrations.map((integration) => (
                <div key={integration.id} className="rounded-xl border border-line bg-panel-muted/60 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{integration.label}</p>
                    <CheckCircle2 className="size-5 text-royal" />
                  </div>
                  <p className="mt-2 text-sm text-muted">Webhook health {integration.webhookHealth}% - {integration.lastSync}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
          <Card className="p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-royal">Operational recommendations</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">From dashboard visibility to disciplined operations rhythm.</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              KitchenFlow turns live order, inventory, webhook, payout, and delivery signals into recommendations that operators can trust during peak service.
            </p>
            <div className="mt-6 space-y-3">
              {automationPlaybooks.map(([title, copy]) => (
                <div key={title} className="rounded-xl border border-line bg-panel-muted/55 p-4">
                  <p className="font-black">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{copy}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="overflow-hidden p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-royal">Predictive analytics</p>
                <h3 className="mt-2 text-2xl font-black">Dinner-window forecast</h3>
              </div>
              <span className="rounded-full border border-royal/25 bg-royal/10 px-3 py-1 text-xs font-bold text-royal">Forecast assisted</span>
            </div>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { hour: '17', actual: 74, forecast: 82 },
                  { hour: '18', actual: 112, forecast: 126 },
                  { hour: '19', actual: 148, forecast: 174 },
                  { hour: '20', actual: 164, forecast: 188 },
                  { hour: '21', actual: 132, forecast: 149 }
                ]}>
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#899994', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#0a1012', border: '1px solid #23302d', borderRadius: 12 }} />
                  <Bar dataKey="actual" fill="#27e8a6" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="forecast" fill="#5ff1d9" fillOpacity={0.45} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </section>

      <section id="enterprise" className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            ['SLA command', 'Heatmap-ready layouts, delayed dispatch signals, outlet pressure, and escalation-ready queues.'],
            ['Finance trust', 'Payout variance, aggregator settlement state, audit trails, and change visibility for finance teams.'],
            ['Operations advisory', 'Guidance for prep-time anomalies, stock exposure, and outlet-level demand forecasts.']
          ].map(([title, copy]) => (
            <Card key={title} className="p-6">
              <h3 className="text-xl font-black">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
