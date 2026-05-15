export type Role = 'owner' | 'manager' | 'kitchen' | 'support';

export interface AuthOutlet {
  id: string;
  name: string;
  city: string;
}

export interface AuthRestaurant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  outlets: AuthOutlet[];
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  restaurantId: string;
  restaurant: AuthRestaurant;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

export type Channel = 'swiggy' | 'zomato' | 'uber_eats' | 'deliveroo' | 'talabat' | 'doordash' | 'direct';

export interface Money {
  amount: number;
  currency: 'INR' | 'USD' | 'AED' | 'GBP';
}

export interface OrderLine {
  id: string;
  name: string;
  quantity: number;
  price: Money;
  modifiers?: string[];
}

export interface Order {
  id: string;
  publicId: string;
  restaurantId: string;
  outletId: string;
  outletName: string;
  outletCity: string;
  channel: Channel;
  customerName: string;
  status: OrderStatus;
  total: Money;
  placedAt: string;
  updatedAt: string;
  acceptedAt?: string | null;
  preparingAt?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  etaMinutes: number;
  items: OrderLine[];
}

export interface OrderStatusUpdatedEvent {
  restaurantId: string;
  orderId: string;
  outletId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  status: OrderStatus;
  timestamps: {
    acceptedAt: string | null;
    preparingAt: string | null;
    dispatchedAt: string | null;
    deliveredAt: string | null;
    cancelledAt: string | null;
  };
  order: Order;
}

export interface OrderCreatedEvent {
  restaurantId: string;
  order: Order;
}

export interface Kpi {
  label: string;
  value: string;
  delta: number;
  tone: 'good' | 'warning' | 'critical' | 'neutral';
}

export interface Integration {
  id: string;
  channel: Channel;
  label: string;
  status: 'connected' | 'degraded' | 'syncing' | 'offline';
  lastSync: string;
  webhookHealth: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  outletScope: string[];
  price: Money;
  available: boolean;
  variants: string[];
  imageUrl?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardKpi {
  label: string;
  value: number;
  unit: 'currency' | 'number' | 'minutes' | 'percent';
  delta: number;
  tone: 'good' | 'warning' | 'critical' | 'neutral';
}

export interface RevenuePoint {
  day: string;
  revenue: number;
  orders: number;
}

export interface ChannelBreakdown {
  channel: Channel;
  orders: number;
  revenue: number;
}

export interface OutletPerformance {
  outletId: string;
  outlet: string;
  city: string;
  orders: number;
  revenue: number;
  uptime: number;
}

export interface InventoryWarning {
  id: string;
  outletId: string;
  outletName: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  reorderAt: number;
  stockPercent: number;
}

export interface AnalyticsSummary {
  generatedAt: string;
  kpis: DashboardKpi[];
  totals: {
    revenueToday: number;
    ordersToday: number;
    averagePrepTime: number;
    cancellationRate: number;
  };
  operational: {
    activeKitchenLoad: number;
    averageQueueLatencyMinutes: number;
    slaBreaches: number;
    inventoryRiskItems: number;
  };
  orderStatus: Record<OrderStatus, number>;
  revenueSeries: RevenuePoint[];
  channelBreakdown: ChannelBreakdown[];
  outletPerformance: OutletPerformance[];
  integrationHealth: Array<{ status: string; count: number }>;
  inventoryWarnings: InventoryWarning[];
}

export interface InventoryItem {
  id: string;
  outletId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  reorderAt: number;
  stockPercent: number;
  risk: 'critical' | 'warning' | 'healthy';
  updatedAt: string;
}

export interface InventoryResponse {
  outlet: AuthOutlet;
  items: InventoryItem[];
  activity: InventoryActivity[];
}

export interface InventoryActivity {
  id: string;
  outletId: string;
  sku: string;
  name: string;
  delta: number;
  reason: string;
  quantityAfter: number;
  createdAt: string;
}

export interface InventoryChangedEvent {
  restaurantId: string;
  outletId: string;
  sku: string;
  quantity: number;
  item: InventoryItem;
  activity?: InventoryActivity;
}

export interface OperationsNotification {
  id: string;
  type: 'order_created' | 'order_status_updated' | 'inventory_low' | 'inventory_changed' | 'sla_breach' | 'activity';
  title: string;
  detail: string;
  createdAt: string;
  tone: 'success' | 'warning' | 'critical' | 'neutral';
}

export interface OperationalActivity {
  id: string;
  type: string;
  title: string;
  detail: string;
  tone: 'success' | 'warning' | 'critical' | 'neutral';
  outletId?: string;
  outletName?: string;
  actorId?: string;
  occurredAt: string;
}

export interface AuditLogEntry {
  id: string;
  restaurantId: string;
  actorUserId?: string | null;
  actorRole?: Role | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  outletId?: string | null;
  outletName?: string | null;
  metadata: Record<string, unknown>;
  correlationId?: string | null;
  createdAt: string;
}

export interface AuditLogResponse {
  items: AuditLogEntry[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  correlationId: string;
}

export interface OperationalMetrics {
  generatedAt: string;
  requests: {
    total: number;
    errors: number;
    averageMs: number;
  };
  websocket: {
    activeConnections: number;
    totalConnections: number;
    totalDisconnects: number;
    emittedEvents: number;
    rejectedConnections: number;
  };
  operations: {
    ordersToday: number;
    activeOrders: number;
    averageQueueLatencyMinutes: number;
    slaBreachesToday: number;
    inventoryRiskItems: number;
  };
}

export interface DashboardIntegration {
  id: string;
  provider: Channel | string;
  label: string;
  status: 'connected' | 'degraded' | 'syncing' | 'offline';
  lastSyncAt: string | null;
  lastSync: string;
  webhookHealth: number;
  webhookSecretConfigured: boolean;
}
