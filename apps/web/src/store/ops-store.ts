'use client';

import { create } from 'zustand';
import type { OperationsNotification, Order, OrderStatus } from '@kitchenflow/types';
import { orders } from '@/lib/data';

interface OpsStore {
  darkMode: boolean;
  notifications: OperationsNotification[];
  socketStatus: 'idle' | 'connected' | 'reconnecting' | 'disconnected';
  orders: Order[];
  query: string;
  status: OrderStatus | 'all';
  toggleDarkMode: () => void;
  addNotification: (notification: Omit<OperationsNotification, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => void;
  dismissNotification: (id: string) => void;
  setSocketStatus: (status: OpsStore['socketStatus']) => void;
  clearNotifications: () => void;
  setQuery: (query: string) => void;
  setStatus: (status: OrderStatus | 'all') => void;
  advanceOrder: (id: string) => void;
  injectOrder: () => void;
}

const flow: OrderStatus[] = ['pending', 'accepted', 'preparing', 'dispatched', 'delivered'];

export const useOpsStore = create<OpsStore>((set) => ({
  darkMode: false,
  notifications: [],
  socketStatus: 'idle',
  orders,
  query: '',
  status: 'all',
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: notification.id ?? `note_${Date.now()}`,
          createdAt: notification.createdAt ?? new Date().toISOString()
        },
        ...state.notifications.filter((item) => item.id !== notification.id)
      ].slice(0, 30)
    })),
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id)
    })),
  setSocketStatus: (socketStatus) => set({ socketStatus }),
  clearNotifications: () => set({ notifications: [] }),
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
          customerName: ['Nisha Rao', 'Dev Malhotra', 'Anika Sen'][Math.floor(Math.random() * 3)],
          placedAt: 'just now',
          status: 'pending' as OrderStatus
        },
        ...state.orders
      ].slice(0, 12)
    }))
}));
