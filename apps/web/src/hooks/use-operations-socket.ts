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
import type { OrdersQuery } from '@/lib/dashboard-api';
import { useOpsStore } from '@/store/ops-store';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1').replace(/\/v1$/, '');

export function useOperationsSocket() {
  const { tokens, user } = useAuth();
  const queryClient = useQueryClient();
  const addNotification = useOpsStore((state) => state.addNotification);
  const setSocketStatus = useOpsStore((state) => state.setSocketStatus);
  const markRealtimeEvent = useOpsStore((state) => state.markRealtimeEvent);
  const restaurantId = user?.restaurantId ?? getRestaurantIdFromToken(tokens?.accessToken);

  useEffect(() => {
    if (!restaurantId || !tokens?.accessToken) return;

    const socket = io(`${SOCKET_URL}/operations`, {
      auth: { token: tokens?.accessToken, restaurantId, requestId: `socket-${Date.now()}` },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000
    });

    const joinRoom = () => {
      setSocketStatus('connected');
      markRealtimeEvent();
      socket.emit('notifications.join', { restaurantId });
    };

    const handleDisconnect = () => {
      setSocketStatus('disconnected');
    };

    const handleReconnectAttempt = () => {
      setSocketStatus('reconnecting');
    };

    const refetchOperations = () => {
      void queryClient.refetchQueries({ queryKey: ['orders'], type: 'active' });
      void queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
    };

    const upsertOrder = (order: Order) => {
      const queries = queryClient.getQueriesData<PaginatedResponse<Order>>({ queryKey: ['orders'] });
      queries.forEach(([queryKey, existing]) => {
        if (!existing) return;
        const query = Array.isArray(queryKey) ? (queryKey[1] as OrdersQuery | undefined) : undefined;
        const matches = orderMatchesQuery(order, query);
        const hasOrder = existing.items.some((item) => item.id === order.id);
        const items = matches
          ? hasOrder
            ? existing.items.map((item) => (item.id === order.id ? order : item))
            : [order, ...existing.items].slice(0, existing.limit ?? existing.items.length + 1)
          : existing.items.filter((item) => item.id !== order.id);
        queryClient.setQueryData(queryKey, {
          ...existing,
          items,
          total: matches && !hasOrder ? existing.total + 1 : !matches && hasOrder ? Math.max(0, existing.total - 1) : existing.total
        });
      });
    };

    const handleOrderCreated = (event: OrderCreatedEvent) => {
      upsertOrder(event.order);
      markRealtimeEvent();
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
      markRealtimeEvent();
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
      markRealtimeEvent();
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
    };

    socket.on('connect', joinRoom);
    socket.on('disconnect', handleDisconnect);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('order.created', handleOrderCreated);
    socket.on('order.status.updated', handleOrderStatusUpdated);
    socket.on('inventory.changed', handleInventoryChanged);

    joinRoom();

    return () => {
      socket.off('connect', joinRoom);
      socket.off('disconnect', handleDisconnect);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('order.created', handleOrderCreated);
      socket.off('order.status.updated', handleOrderStatusUpdated);
      socket.off('inventory.changed', handleInventoryChanged);
      socket.disconnect();
      setSocketStatus('idle');
    };
  }, [addNotification, markRealtimeEvent, queryClient, restaurantId, setSocketStatus, tokens?.accessToken]);

  useEffect(() => {
    if (useOpsStore.getState().socketStatus === 'connected') return;
    const timer = window.setInterval(() => {
      if (useOpsStore.getState().socketStatus !== 'connected') {
        void queryClient.refetchQueries({ queryKey: ['orders'], type: 'active' });
        void queryClient.refetchQueries({ queryKey: ['control-center'], type: 'active' });
        void queryClient.refetchQueries({ queryKey: ['queue-metrics'], type: 'active' });
      }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [queryClient, restaurantId, tokens?.accessToken]);
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

function orderMatchesQuery(order: Order, query?: OrdersQuery) {
  if (!query) return true;
  if (query.status && query.status !== 'all' && order.status !== query.status) return false;
  if (query.channel && query.channel !== 'all' && order.channel !== query.channel) return false;
  if (query.outletId && query.outletId !== 'all' && order.outletId !== query.outletId) return false;
  if (query.query) {
    const needle = query.query.toLowerCase();
    if (!order.publicId.toLowerCase().includes(needle) && !order.customerName.toLowerCase().includes(needle)) return false;
  }
  if (query.dateFrom && Date.parse(order.placedAt) < Date.parse(query.dateFrom)) return false;
  if (query.dateTo && Date.parse(order.placedAt) > Date.parse(query.dateTo)) return false;
  return true;
}
