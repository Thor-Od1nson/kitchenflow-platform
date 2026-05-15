import type { Integration, Kpi, MenuItem, Order } from '@kitchenflow/types';

export const kpis: Kpi[] = [
  { label: 'GMV today', value: '₹18.7L', delta: 12.4, tone: 'good' },
  { label: 'Live orders', value: '342', delta: 8.1, tone: 'good' },
  { label: 'Avg prep time', value: '13m', delta: -4.3, tone: 'good' },
  { label: 'Menu sync health', value: '99.2%', delta: 1.8, tone: 'neutral' }
];

export const orders: Order[] = [
  {
    id: 'ord_1',
    publicId: '#BLR-10482',
    restaurantId: 'rest_1',
    outletId: 'outlet_indiranagar',
    outletName: 'Indiranagar',
    outletCity: 'Bengaluru',
    channel: 'swiggy',
    customerName: 'Aarav Sharma',
    status: 'pending',
    total: { amount: 1180, currency: 'INR' },
    placedAt: '2 min ago',
    updatedAt: new Date().toISOString(),
    etaMinutes: 28,
    items: [
      { id: 'line_1', name: 'Truffle Paneer Bowl', quantity: 2, price: { amount: 460, currency: 'INR' } },
      { id: 'line_2', name: 'Blueberry Kefir', quantity: 1, price: { amount: 260, currency: 'INR' } }
    ]
  },
  {
    id: 'ord_2',
    publicId: '#MUM-88410',
    restaurantId: 'rest_1',
    outletId: 'outlet_bkc',
    outletName: 'BKC',
    outletCity: 'Mumbai',
    channel: 'zomato',
    customerName: 'Mira Iyer',
    status: 'preparing',
    total: { amount: 760, currency: 'INR' },
    placedAt: '8 min ago',
    updatedAt: new Date().toISOString(),
    acceptedAt: new Date().toISOString(),
    preparingAt: new Date().toISOString(),
    etaMinutes: 18,
    items: [{ id: 'line_3', name: 'Korean Millet Bowl', quantity: 1, price: { amount: 760, currency: 'INR' } }]
  },
  {
    id: 'ord_3',
    publicId: '#DEL-32817',
    restaurantId: 'rest_1',
    outletId: 'outlet_cyberhub',
    outletName: 'CyberHub',
    outletCity: 'Gurugram',
    channel: 'uber_eats',
    customerName: 'Kabir Mehta',
    status: 'dispatched',
    total: { amount: 1430, currency: 'INR' },
    placedAt: '19 min ago',
    updatedAt: new Date().toISOString(),
    acceptedAt: new Date().toISOString(),
    preparingAt: new Date().toISOString(),
    dispatchedAt: new Date().toISOString(),
    etaMinutes: 9,
    items: [{ id: 'line_4', name: 'Nashville Chicken Stack', quantity: 2, price: { amount: 715, currency: 'INR' } }]
  }
];

export const menuItems: MenuItem[] = [
  {
    id: 'mi_1',
    name: 'Korean Millet Bowl',
    category: 'Signature Bowls',
    outletScope: ['Indiranagar', 'BKC', 'CyberHub'],
    price: { amount: 760, currency: 'INR' },
    available: true,
    variants: ['Regular', 'Extra Protein', 'Vegan']
  },
  {
    id: 'mi_2',
    name: 'Truffle Paneer Bowl',
    category: 'Signature Bowls',
    outletScope: ['Indiranagar', 'BKC'],
    price: { amount: 460, currency: 'INR' },
    available: true,
    variants: ['Regular', 'Jain']
  },
  {
    id: 'mi_3',
    name: 'Blueberry Kefir',
    category: 'Beverages',
    outletScope: ['All outlets'],
    price: { amount: 260, currency: 'INR' },
    available: false,
    variants: ['250ml', '500ml']
  }
];

export const integrations: Integration[] = [
  { id: 'int_1', channel: 'swiggy', label: 'Swiggy', status: 'connected', lastSync: '42s ago', webhookHealth: 99 },
  { id: 'int_2', channel: 'zomato', label: 'Zomato', status: 'syncing', lastSync: 'syncing now', webhookHealth: 96 },
  { id: 'int_3', channel: 'uber_eats', label: 'Uber Eats', status: 'connected', lastSync: '2m ago', webhookHealth: 98 },
  { id: 'int_4', channel: 'deliveroo', label: 'Deliveroo', status: 'degraded', lastSync: '12m ago', webhookHealth: 87 },
  { id: 'int_5', channel: 'talabat', label: 'Talabat', status: 'connected', lastSync: '4m ago', webhookHealth: 97 },
  { id: 'int_6', channel: 'doordash', label: 'DoorDash', status: 'offline', lastSync: '1h ago', webhookHealth: 0 }
];

export const revenueSeries = [
  { day: 'Mon', revenue: 124000, orders: 820 },
  { day: 'Tue', revenue: 141000, orders: 910 },
  { day: 'Wed', revenue: 132000, orders: 880 },
  { day: 'Thu', revenue: 167000, orders: 1080 },
  { day: 'Fri', revenue: 196000, orders: 1270 },
  { day: 'Sat', revenue: 228000, orders: 1520 },
  { day: 'Sun', revenue: 211000, orders: 1435 }
];

export const outletComparison = [
  { outlet: 'Indiranagar', revenue: 42, uptime: 99 },
  { outlet: 'BKC', revenue: 37, uptime: 98 },
  { outlet: 'CyberHub', revenue: 31, uptime: 97 },
  { outlet: 'Koramangala', revenue: 26, uptime: 99 }
];
