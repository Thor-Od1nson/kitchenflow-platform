export type Role = 'owner' | 'admin' | 'ops_manager' | 'store_manager' | 'chef' | 'analyst';

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
  channel: Channel;
  customerName: string;
  status: OrderStatus;
  total: Money;
  placedAt: string;
  etaMinutes: number;
  items: OrderLine[];
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
