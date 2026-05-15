'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from './cn';

const button = cva(
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-panel shadow-soft hover:opacity-90 focus-visible:outline-royal',
        secondary: 'border border-line bg-panel text-ink hover:bg-panel-muted',
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
        'h-10 w-full rounded-xl border border-line bg-panel px-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-royal focus:ring-4 focus:ring-blue-100/70 dark:focus:ring-blue-400/10',
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
  return <div className={cn('rounded-2xl border border-line bg-panel shadow-soft', className)} {...props} />;
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
  return <div className={cn('animate-pulse rounded-xl bg-panel-muted', className)} />;
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
    <div className="inline-flex rounded-xl border border-line bg-panel p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            'h-8 rounded-lg px-3 text-sm font-semibold transition',
            value === tab ? 'bg-ink text-panel' : 'text-muted hover:bg-panel-muted hover:text-ink',
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
    <button className="inline-flex h-10 items-center justify-between gap-3 rounded-xl border border-line bg-panel px-3 text-sm font-semibold text-ink transition hover:bg-panel-muted">
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
      <div className="w-full max-w-lg rounded-2xl border border-line bg-panel shadow-glow">
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
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-panel p-4 shadow-soft">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
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
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>
          <p className="mt-1 text-xs font-medium text-muted">{detail}</p>
        </div>
        {children}
      </div>
    </Card>
  );
}
