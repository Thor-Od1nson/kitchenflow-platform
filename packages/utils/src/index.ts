import type { OrderStatus } from '@kitchenflow/types';

export const statusCopy: Record<OrderStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  preparing: 'Preparing',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

export const statusTone: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800',
  accepted: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-800',
  preparing: 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-950/40 dark:text-purple-200 dark:ring-purple-800',
  dispatched: 'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-200 dark:ring-cyan-800',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-800'
};

export function formatMoney(amount: number, currency = 'AED') {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function percentage(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
