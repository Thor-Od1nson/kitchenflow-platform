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

export type Channel =
  | 'deliveroo'
  | 'talabat'
  | 'careem'
  | 'noon_food'
  | 'hungerstation'
  | 'jahez'
  | 'uber_eats'
  | 'business_central'
  | 'pos'
  | 'direct';

export interface Money {
  amount: number;
  currency: 'AED' | 'SAR' | 'QAR' | 'BHD' | 'USD' | 'GBP';
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
  requestId?: string;
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
  requestId?: string;
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
  slaMetrics: {
    breachesToday: number;
    breachRate: number;
    averageLatencyMinutes: number;
  };
  channelProfitability: Array<{ channel: Channel | string; gross: number; expectedPayout: number; marginPercent: number }>;
  inventoryConsumptionTrends: Array<{ sku: string; name: string; consumed: number; unit: string }>;
  integrationHealth: Array<{ status: string; count: number }>;
  inventoryWarnings: InventoryWarning[];
}

export interface OperationalIntelligenceSummary {
  generatedAt: string;
  activeOrders: number;
  slaBreachCount: number;
  delayedDispatchCount: number;
  failedWebhookCount: number;
  realtimeOrderThroughput: number;
  websocket: {
    activeConnections: number;
    totalConnections: number;
    totalDisconnects: number;
    emittedEvents: number;
    rejectedConnections: number;
  };
  systemHealth: Array<{ label: string; status: 'healthy' | 'warning' | 'critical'; detail: string }>;
  outletStatus: Array<{ outletId: string; outlet: string; city: string; activeOrders: number; slaBreaches: number; status: 'online' | 'strained' | 'critical' }>;
}

export interface QueueMetrics {
  generatedAt: string;
  workerHeartbeatAt?: string | null;
  workerOnline: boolean;
  counts: {
    waiting: number;
    active: number;
    delayed: number;
    completed: number;
    failed: number;
    paused: number;
    backlog: number;
  };
  retryCount: number;
  averageProcessingMs: number;
  dlqCount?: number;
}

export interface AdvancedOperationalAnalytics {
  generatedAt: string;
  slaHeatmap: Array<{ outlet: string; hour: string; breaches: number; orders: number }>;
  outletLoadComparison: Array<{ outlet: string; activeOrders: number; loadScore: number }>;
  slowestFulfillmentOutlet?: { outlet: string; averageMinutes: number } | null;
  busiestTimeWindow?: { hour: string; orders: number } | null;
  bottleneckAlerts: Array<{ label: string; severity: 'warning' | 'critical'; detail: string }>;
  cancellationSpikes: Array<{ hour: string; cancellations: number; cancellationRate: number }>;
}

export interface PayoutReconciliationSummary {
  generatedAt: string;
  totals: {
    gross: number;
    expected: number;
    actual: number;
    variance: number;
    pending: number;
    variances: number;
  };
  rows: Array<{
    id: string;
    publicId: string;
    outletName?: string | null;
    channel: string;
    grossAmount: number;
    expectedPayout: number;
    actualPayout?: number | null;
    varianceAmount: number;
    status: string;
    settlementDueAt: string;
    settledAt?: string | null;
  }>;
}

export interface WebhookEventLog {
  id: string;
  provider: string;
  eventType: string;
  externalId: string;
  status: string;
  signatureValid: boolean;
  retryCount: number;
  replayCount: number;
  replayHistory: Array<{ at: string; action: string; status: string; detail?: string }>;
  lastRetryAt?: string | null;
  error?: string | null;
  processedAt?: string | null;
  createdAt: string;
}

export interface QueueActivityEntry {
  id: string;
  queue: string;
  jobName: string;
  jobId?: string | null;
  status: string;
  detail: string;
  createdAt: string;
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
  requestId?: string;
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
  severity?: 'info' | 'warning' | 'error' | 'critical';
  read?: boolean;
  dismissed?: boolean;
  groupCount?: number;
  actionLabel?: string;
  actionUrl?: string;
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
  severity?: 'info' | 'warning' | 'error' | 'critical';
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
  requestId: string;
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
    eventsPerSecond?: number;
  };
  queues?: {
    active: number;
    failed: number;
    retryCount: number;
    dlqJobs: number;
  };
  webhooks?: {
    failures: number;
  };
  auth?: {
    refreshCount: number;
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
