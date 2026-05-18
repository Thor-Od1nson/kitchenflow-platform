import type { Role } from '@kitchenflow/types';

export const roleDefaultRoutes: Record<Role, string> = {
  owner: '/dashboard',
  manager: '/dashboard',
  kitchen: '/dashboard/orders',
  support: '/dashboard/notifications'
};

export const routeRoles: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: '/dashboard/settings', roles: ['owner'] },
  { prefix: '/dashboard/control-center', roles: ['owner'] },
  { prefix: '/dashboard/integrations', roles: ['owner', 'manager'] },
  { prefix: '/dashboard/stores', roles: ['owner', 'manager'] },
  { prefix: '/dashboard/orders', roles: ['owner', 'manager', 'kitchen', 'support'] },
  { prefix: '/dashboard/menus', roles: ['owner', 'manager', 'support'] },
  { prefix: '/dashboard/inventory', roles: ['owner', 'manager', 'support'] },
  { prefix: '/dashboard/analytics', roles: ['owner', 'manager', 'support'] },
  { prefix: '/dashboard/customers', roles: ['owner', 'manager', 'support'] },
  { prefix: '/dashboard/stores', roles: ['owner', 'manager'] },
  { prefix: '/dashboard/notifications', roles: ['owner', 'manager', 'support'] },
  { prefix: '/dashboard/audit', roles: ['owner', 'manager', 'support'] },
  { prefix: '/dashboard', roles: ['owner', 'manager'] }
];

export function getDefaultRouteByRole(role: Role) {
  return roleDefaultRoutes[role];
}

export function getRouteAccess(pathname: string) {
  return routeRoles.find((route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`));
}

export function canAccessRoute(role: Role, pathname: string) {
  const access = getRouteAccess(pathname);
  return !access || access.roles.includes(role);
}

export function isRole(value: unknown): value is Role {
  return value === 'owner' || value === 'manager' || value === 'kitchen' || value === 'support';
}
