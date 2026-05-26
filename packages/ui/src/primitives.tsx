'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check, ChevronDown, Sparkles, Search, X } from 'lucide-react';
import { cn } from './cn';

const button = cva(
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-royal text-slate-950 shadow-soft hover:bg-cyan focus-visible:outline-royal',
        secondary: 'border border-line bg-panel/80 text-ink shadow-soft hover:border-royal/50 hover:bg-panel-muted',
        ghost: 'text-muted hover:bg-panel-muted hover:text-ink',
        danger: 'bg-rose-600 text-white hover:bg-rose-700'
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-5 text-base'
      }
    },
    defaultVariants: { variant: 'primary', size: 'md' }
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-xl border border-line bg-panel/80 px-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-royal focus:ring-4 focus:ring-royal/10',
        className,
      )}
      {...props}
    />
  );
}

export function SearchInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <Input className="pl-9" {...props} />
    </label>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass-panel rounded-xl border shadow-soft', className)} {...props} />;
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-gradient-to-r from-panel-muted via-royal/10 to-panel-muted', className)} />;
}

export function Tabs({
  tabs,
  value,
  onChange
}: {
  tabs: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-panel/80 p-1 shadow-soft">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            'h-8 rounded-lg px-3 text-sm font-semibold transition',
            value === tab ? 'bg-royal text-slate-950 shadow-soft' : 'text-muted hover:bg-panel-muted hover:text-ink',
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export function Dropdown({
  label,
  options
}: {
  label: string;
  options: string[];
}) {
  return (
    <button className="inline-flex h-10 items-center justify-between gap-3 rounded-xl border border-line bg-panel/80 px-3 text-sm font-semibold text-ink transition hover:border-royal/50 hover:bg-panel-muted">
      {label}
      <ChevronDown className="size-4 text-muted" />
      <span className="sr-only">{options.join(', ')}</span>
    </button>
  );
}

export function ModalFrame({
  title,
  children,
  onClose
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg rounded-xl border shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-panel-muted" aria-label="Close modal">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Toast({
  title,
  detail
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="glass-panel flex items-start gap-3 rounded-2xl border p-4 shadow-soft">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-royal/15 text-royal">
        <Check className="size-4" />
      </span>
      <div>
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="mt-1 text-xs text-muted">{detail}</p>
      </div>
    </div>
  );
}

export function CommandPalette({
  commands
}: {
  commands: Array<{ label: string; shortcut: string }>;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line p-3">
        <SearchInput placeholder="Search commands..." />
      </div>
      <div className="divide-y divide-line">
        {commands.map((command) => (
          <button key={command.label} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-panel-muted">
            <span className="font-semibold text-ink">{command.label}</span>
            <kbd className="rounded-md border border-line bg-panel-muted px-2 py-1 text-xs text-muted">{command.shortcut}</kbd>
          </button>
        ))}
      </div>
    </Card>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  children
}: {
  label: string;
  value: string;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="group relative overflow-hidden p-4 transition duration-200 hover:border-royal/35">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-ink">{value}</p>
          <p className="mt-1 text-xs font-medium text-muted">{detail}</p>
        </div>
        {children}
      </div>
    </Card>
  );
}

export function OperationalStatusChip({
  label,
  tone = 'neutral',
  pulse
}: {
  label: string;
  tone?: 'good' | 'warning' | 'critical' | 'neutral';
  pulse?: boolean;
}) {
  const toneClass =
    tone === 'critical'
      ? 'border-rose-400/30 bg-rose-400/10 text-rose-200'
      : tone === 'warning'
        ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
        : tone === 'good'
          ? 'border-royal/30 bg-royal/10 text-royal'
          : 'border-line bg-panel-muted text-muted';

  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold', toneClass)}>
      <span className={cn('size-1.5 rounded-full bg-current', pulse ? 'live-pulse' : '')} />
      {label}
    </span>
  );
}

export function SlaMeter({
  label,
  value,
  detail,
  tone = 'good'
}: {
  label: string;
  value: number;
  detail: string;
  tone?: 'good' | 'warning' | 'critical';
}) {
  const barClass = tone === 'critical' ? 'from-rose-500 to-amber-300' : tone === 'warning' ? 'from-amber-400 to-royal' : 'from-royal to-cyan';

  return (
    <div className="rounded-xl border border-line bg-panel-muted/45 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-ink">{label}</p>
          <p className="mt-1 text-xs font-semibold text-muted">{detail}</p>
        </div>
        <span className="text-sm font-black text-ink">{value}%</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-panel">
        <div className={cn('h-full rounded-full bg-gradient-to-r', barClass)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function IntelligenceCard({
  title,
  detail,
  meta,
  tone = 'neutral'
}: {
  title: string;
  detail: string;
  meta: string;
  tone?: 'good' | 'warning' | 'critical' | 'neutral';
}) {
  return (
    <Card className="relative overflow-hidden p-4 transition duration-200 hover:border-royal/35">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-ink">{title}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
        </div>
        <OperationalStatusChip label={meta} tone={tone} />
      </div>
    </Card>
  );
}

export function InsightBanner({
  title,
  detail,
  action
}: {
  title: string;
  detail: string;
  action?: string;
}) {
  return (
    <div className="rounded-xl border border-royal/25 bg-royal/10 p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-royal text-slate-950">
          <Sparkles className="size-4" />
        </span>
        <div>
          <p className="font-black text-ink">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{detail}</p>
          {action ? <p className="mt-3 text-xs font-bold uppercase tracking-wide text-royal">{action}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function ActivityStream({
  items
}: {
  items: Array<{ time: string; detail: string; tone?: 'good' | 'warning' | 'critical' | 'neutral' }>;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.time}-${item.detail}`} className="flex gap-3 rounded-xl border border-line bg-panel-muted/45 p-3">
          <OperationalStatusChip label={item.time} tone={item.tone ?? 'neutral'} />
          <p className="min-w-0 text-sm font-semibold leading-6 text-ink">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}
