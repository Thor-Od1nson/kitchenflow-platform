'use client';

import { create } from 'zustand';
import type { OperationsNotification, Order, OrderStatus } from '@kitchenflow/types';
import { orders } from '@/lib/data';

interface OpsStore {
  darkMode: boolean;
  notifications: OperationsNotification[];
  socketStatus: 'idle' | 'connected' | 'reconnecting' | 'disconnected';
  lastRealtimeAt: string | null;
  orders: Order[];
  query: string;
  status: OrderStatus | 'all';
  toggleDarkMode: () => void;
  addNotification: (notification: Omit<OperationsNotification, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => void;
  dismissNotification: (id: string) => void;
  cleanupExpiredNotifications: () => void;
  hydrateNotifications: () => void;
  markAllRead: () => void;
  clearDismissed: () => void;
  setSocketStatus: (status: OpsStore['socketStatus']) => void;
  markRealtimeEvent: () => void;
  clearNotifications: () => void;
  setQuery: (query: string) => void;
  setStatus: (status: OrderStatus | 'all') => void;
  advanceOrder: (id: string) => void;
  injectOrder: () => void;
}

const flow: OrderStatus[] = ['pending', 'accepted', 'preparing', 'dispatched', 'delivered'];
const NOTIFICATIONS_KEY = 'kitchenflow.notifications';
const NOTIFICATION_TTL_MS = 4_000;

function notificationExpiry(notification: OperationsNotification) {
  return Date.parse(notification.createdAt) + NOTIFICATION_TTL_MS;
}

function activeNotifications(notifications: OperationsNotification[]) {
  const now = Date.now();
  return notifications.filter((notification) => notificationExpiry(notification) > now);
}

function persistNotifications(notifications: OperationsNotification[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(activeNotifications(notifications).slice(0, 30)));
}

function readPersistedNotifications() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(NOTIFICATIONS_KEY) ?? '[]') as OperationsNotification[];
    return activeNotifications(parsed);
  } catch {
    return [];
  }
}

export const useOpsStore = create<OpsStore>((set) => ({
  darkMode: true,
  notifications: [],
  socketStatus: 'idle',
  lastRealtimeAt: null,
  orders,
  query: '',
  status: 'all',
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  addNotification: (notification) =>
    set((state) => {
      const identity = notification.id ?? `${notification.type}:${notification.title}:${notification.detail}`;
      const existing = activeNotifications(state.notifications).find((item) => item.id === identity);
      const next = [
        {
          ...(existing ?? {}),
          ...notification,
          id: identity,
          createdAt: notification.createdAt ?? new Date().toISOString(),
          severity: notification.severity ?? (notification.tone === 'critical' ? 'critical' : notification.tone === 'warning' ? 'warning' : 'info'),
          read: false,
          dismissed: false,
          groupCount: (existing?.groupCount ?? 0) + 1
        },
        ...activeNotifications(state.notifications).filter((item) => item.id !== identity)
      ].slice(0, 30);
      persistNotifications(next);
      return { notifications: next };
    }),
  dismissNotification: (id) =>
    set((state) => {
      const next = state.notifications.map((notification) => (notification.id === id ? { ...notification, dismissed: true } : notification)).filter((notification) => !notification.dismissed);
      persistNotifications(next);
      return { notifications: next };
    }),
  cleanupExpiredNotifications: () =>
    set((state) => {
      const next = activeNotifications(state.notifications);
      if (next.length === state.notifications.length) return state;
      persistNotifications(next);
      return { notifications: next };
    }),
  hydrateNotifications: () => set({ notifications: readPersistedNotifications() }),
  markAllRead: () =>
    set((state) => {
      const next = state.notifications.map((notification) => ({ ...notification, read: true }));
      persistNotifications(next);
      return { notifications: next };
    }),
  clearDismissed: () =>
    set((state) => {
      const next = state.notifications.filter((notification) => !notification.dismissed);
      persistNotifications(next);
      return { notifications: next };
    }),
  setSocketStatus: (socketStatus) => set({ socketStatus }),
  markRealtimeEvent: () => set({ lastRealtimeAt: new Date().toISOString() }),
  clearNotifications: () => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(NOTIFICATIONS_KEY);
    set({ notifications: [] });
  },
  setQuery: (query) => set({ query }),
  setStatus: (status) => set({ status }),
  advanceOrder: (id) =>
    set((state) => ({
      orders: state.orders.map((order) => {
        if (order.id !== id) return order;
        const next = flow[Math.min(flow.indexOf(order.status) + 1, flow.length - 1)] ?? order.status;
        return { ...order, status: next };
      })
    })),
  injectOrder: () =>
    set((state) => ({
      orders: [
        {
          ...orders[0],
          id: `ord_${Date.now()}`,
          publicId: `#LIVE-${Math.floor(Math.random() * 90000 + 10000)}`,
          customerName: ['Hassan Karam', 'Layla Al Marri', 'Fahad Al Qahtani'][Math.floor(Math.random() * 3)],
          placedAt: 'just now',
          status: 'pending' as OrderStatus
        },
        ...state.orders
      ].slice(0, 12)
    }))
}));
