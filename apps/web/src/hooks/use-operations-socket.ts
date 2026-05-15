'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import type { Order } from '@kitchenflow/types';
import { useAuth } from '@/components/auth/auth-provider';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1').replace(/\/v1$/, '');

export function useOperationsSocket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.restaurantId) return;

    const socket = io(`${SOCKET_URL}/operations`, {
      transports: ['websocket'],
      auth: { restaurantId: user.restaurantId }
    });

    socket.emit('notifications.join', { restaurantId: user.restaurantId });

    socket.on('order.created', () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    });

    socket.on('order.status.updated', (event: { orderId: string; order?: Order; previousStatus?: string; newStatus?: string; outletId?: string }) => {
      queryClient.setQueriesData<{ items: Order[] }>(
        { queryKey: ['orders'] },
        (existing) =>
          existing
            ? {
                ...existing,
                items: existing.items.map((order) => (order.id === event.orderId && event.order ? event.order : order))
              }
            : existing
      );
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    });

    socket.on('inventory.changed', () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, user?.restaurantId]);
}
