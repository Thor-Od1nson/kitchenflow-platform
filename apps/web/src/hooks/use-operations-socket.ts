'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import type {
  InventoryChangedEvent,
  InventoryResponse,
  Order,
  OrderCreatedEvent,
  OrderStatusUpdatedEvent,
  PaginatedResponse
} from '@kitchenflow/types';
import { useAuth } from '@/components/auth/auth-provider';
import { useOpsStore } from '@/store/ops-store';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1').replace(/\/v1$/, '');

export function useOperationsSocket() {
  const { tokens, user } = useAuth();
  const queryClient = useQueryClient();
  const addNotification = useOpsStore((state) => state.addNotification);
  const restaurantId = user?.restaurantId ?? getRestaurantIdFromToken(tokens?.accessToken);

  useEffect(() => {
    if (!restaurantId) return;

    const socket = io(`${SOCKET_URL}/operations`, {
      auth: { token: tokens?.accessToken, restaurantId },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000
    });

    const joinRoom = () => {
      socket.emit('notifications.join', { restaurantId });
    };

    const refetchOperations = () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
    };

    const upsertOrder = (order: Order) => {
      queryClient.setQueriesData<PaginatedResponse<Order>>(
        { queryKey: ['orders'] },
        (existing) =>
          existing
            ? {
                ...existing,
                items: existing.items.some((item) => item.id === order.id)
                  ? existing.items.map((item) => (item.id === order.id ? order : item))
                  : [order, ...existing.items].slice(0, existing.limit ?? existing.items.length + 1)
              }
            : existing
      );
    };

    const handleOrderCreated = (event: OrderCreatedEvent) => {
      upsertOrder(event.order);
      addNotification({
        type: 'order_created',
        id: `order_created:${event.order.id}:${event.order.updatedAt}`,
        title: 'New order received',
        detail: `${event.order.publicId} from ${event.order.customerName}`,
        tone: 'success'
      });
      refetchOperations();
    };

    const handleOrderStatusUpdated = (event: OrderStatusUpdatedEvent) => {
      upsertOrder(event.order);
      addNotification({
        type: 'order_status_updated',
        id: `order_status_updated:${event.order.id}:${event.previousStatus}:${event.newStatus}:${event.order.updatedAt}`,
        title: 'Order status updated',
        detail: `${event.order.publicId} moved to ${event.newStatus.replace('_', ' ')}`,
        tone: event.newStatus === 'cancelled' ? 'critical' : 'neutral'
      });
      refetchOperations();
    };

    const handleInventoryChanged = (event: InventoryChangedEvent) => {
      queryClient.setQueriesData<InventoryResponse>(
        { queryKey: ['inventory'] },
        (existing) =>
          existing
            ? {
                ...existing,
                items: existing.items.map((item) => (item.id === event.item.id ? event.item : item)),
                activity: event.activity ? [event.activity, ...existing.activity.filter((item) => item.id !== event.activity?.id)].slice(0, 12) : existing.activity
              }
            : existing
      );
      addNotification({
        type: event.item.risk === 'critical' ? 'inventory_low' : 'inventory_changed',
        id: `inventory_changed:${event.item.id}:${event.item.updatedAt}`,
        title: event.item.risk === 'critical' ? 'Low inventory alert' : 'Inventory updated',
        detail: `${event.item.name} is now ${event.item.quantity} ${event.item.unit}`,
        tone: event.item.risk === 'critical' ? 'critical' : event.item.risk === 'warning' ? 'warning' : 'neutral'
      });
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
    };

    socket.on('connect', joinRoom);
    socket.on('order.created', handleOrderCreated);
    socket.on('order.status.updated', handleOrderStatusUpdated);
    socket.on('inventory.changed', handleInventoryChanged);

    joinRoom();

    return () => {
      socket.off('connect', joinRoom);
      socket.off('order.created', handleOrderCreated);
      socket.off('order.status.updated', handleOrderStatusUpdated);
      socket.off('inventory.changed', handleInventoryChanged);
      socket.disconnect();
    };
  }, [addNotification, queryClient, restaurantId, tokens?.accessToken]);
}

function getRestaurantIdFromToken(token?: string) {
  if (!token) return undefined;
  try {
    const base64 = (token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64)) as { restaurantId?: string };
    return payload.restaurantId;
  } catch {
    return undefined;
  }
}
