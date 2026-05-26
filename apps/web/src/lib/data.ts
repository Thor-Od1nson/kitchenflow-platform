import type { Integration, Kpi, MenuItem, Order } from '@kitchenflow/types';

export const kpis: Kpi[] = [
  { label: 'GMV today', value: 'AED 187k', delta: 12.4, tone: 'good' },
  { label: 'Live orders', value: '342', delta: 8.1, tone: 'good' },
  { label: 'Avg prep time', value: '13m', delta: -4.3, tone: 'good' },
  { label: 'Menu sync health', value: '99.2%', delta: 1.8, tone: 'neutral' }
];

export const orders: Order[] = [
  {
    id: 'ord_1',
    publicId: '#DXB-10482',
    restaurantId: 'rest_1',
    outletId: 'outlet_dubai_marina',
    outletName: 'Dubai Marina',
    outletCity: 'Dubai',
    channel: 'talabat',
    customerName: 'Hassan Karam',
    status: 'pending',
    total: { amount: 118, currency: 'AED' },
    placedAt: '2 min ago',
    updatedAt: new Date().toISOString(),
    etaMinutes: 28,
    items: [
      { id: 'line_1', name: 'Truffle Halloumi Bowl', quantity: 2, price: { amount: 46, currency: 'AED' } },
      { id: 'line_2', name: 'Mint Labneh Cooler', quantity: 1, price: { amount: 26, currency: 'AED' } }
    ]
  },
  {
    id: 'ord_2',
    publicId: '#AUH-88410',
    restaurantId: 'rest_1',
    outletId: 'outlet_yas',
    outletName: 'Abu Dhabi Yas',
    outletCity: 'Abu Dhabi',
    channel: 'deliveroo',
    customerName: 'Layla Al Marri',
    status: 'preparing',
    total: { amount: 76, currency: 'AED' },
    placedAt: '8 min ago',
    updatedAt: new Date().toISOString(),
    acceptedAt: new Date().toISOString(),
    preparingAt: new Date().toISOString(),
    etaMinutes: 18,
    items: [{ id: 'line_3', name: 'Korean Rice Bowl', quantity: 1, price: { amount: 76, currency: 'AED' } }]
  },
  {
    id: 'ord_3',
    publicId: '#RUH-32817',
    restaurantId: 'rest_1',
    outletId: 'outlet_olaya',
    outletName: 'Riyadh Olaya',
    outletCity: 'Riyadh',
    channel: 'hungerstation',
    customerName: 'Fahad Al Qahtani',
    status: 'dispatched',
    total: { amount: 143, currency: 'AED' },
    placedAt: '19 min ago',
    updatedAt: new Date().toISOString(),
    acceptedAt: new Date().toISOString(),
    preparingAt: new Date().toISOString(),
    dispatchedAt: new Date().toISOString(),
    etaMinutes: 9,
    items: [{ id: 'line_4', name: 'Nashville Chicken Stack', quantity: 2, price: { amount: 71.5, currency: 'AED' } }]
  }
];

export const menuItems: MenuItem[] = [
  {
    id: 'mi_1',
    name: 'Korean Rice Bowl',
    category: 'Signature Bowls',
    outletScope: ['Dubai Marina', 'Abu Dhabi Yas', 'Riyadh Olaya'],
    price: { amount: 76, currency: 'AED' },
    available: true,
    variants: ['Regular', 'Extra Protein', 'Vegan']
  },
  {
    id: 'mi_2',
    name: 'Truffle Halloumi Bowl',
    category: 'Signature Bowls',
    outletScope: ['Dubai Marina', 'Business Bay'],
    price: { amount: 46, currency: 'AED' },
    available: true,
    variants: ['Regular', 'Extra halloumi']
  },
  {
    id: 'mi_3',
    name: 'Mint Labneh Cooler',
    category: 'Beverages',
    outletScope: ['All outlets'],
    price: { amount: 26, currency: 'AED' },
    available: false,
    variants: ['250ml', '500ml']
  }
];

export const integrations: Integration[] = [
  { id: 'int_1', channel: 'talabat', label: 'Talabat', status: 'connected', lastSync: '42s ago', webhookHealth: 99 },
  { id: 'int_2', channel: 'careem', label: 'Careem', status: 'syncing', lastSync: 'syncing now', webhookHealth: 96 },
  { id: 'int_3', channel: 'uber_eats', label: 'Uber Eats', status: 'connected', lastSync: '2m ago', webhookHealth: 98 },
  { id: 'int_4', channel: 'deliveroo', label: 'Deliveroo', status: 'degraded', lastSync: '12m ago', webhookHealth: 87 },
  { id: 'int_5', channel: 'noon_food', label: 'Noon Food', status: 'connected', lastSync: '4m ago', webhookHealth: 97 },
  { id: 'int_6', channel: 'jahez', label: 'Jahez', status: 'offline', lastSync: '1h ago', webhookHealth: 0 }
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
  { outlet: 'Dubai Marina', revenue: 42, uptime: 99 },
  { outlet: 'Business Bay', revenue: 37, uptime: 98 },
  { outlet: 'Abu Dhabi Yas', revenue: 31, uptime: 97 },
  { outlet: 'Riyadh Olaya', revenue: 26, uptime: 99 }
];
