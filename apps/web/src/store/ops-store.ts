'use client';

import { create } from 'zustand';
import type { Order, OrderStatus } from '@kitchenflow/types';
import { orders } from '@/lib/data';

interface OpsStore {
  darkMode: boolean;
  orders: Order[];
  query: string;
  status: OrderStatus | 'all';
  toggleDarkMode: () => void;
  setQuery: (query: string) => void;
  setStatus: (status: OrderStatus | 'all') => void;
  advanceOrder: (id: string) => void;
  injectOrder: () => void;
}

const flow: OrderStatus[] = ['pending', 'accepted', 'preparing', 'dispatched', 'delivered'];

export const useOpsStore = create<OpsStore>((set) => ({
  darkMode: false,
  orders,
  query: '',
  status: 'all',
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
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
