'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Skeleton } from '@kitchenflow/ui';
import type { Role } from '@kitchenflow/types';
import { useAuth } from './auth-provider';

const routeRoles: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: '/dashboard/settings', roles: ['owner'] },
  { prefix: '/dashboard/integrations', roles: ['owner', 'manager'] },
  { prefix: '/dashboard/stores', roles: ['owner', 'manager'] },
  { prefix: '/dashboard/orders', roles: ['owner', 'manager', 'kitchen', 'support'] },
  { prefix: '/dashboard/menus', roles: ['owner', 'manager', 'support'] },
  { prefix: '/dashboard/inventory', roles: ['owner', 'manager', 'support'] },
  { prefix: '/dashboard/analytics', roles: ['owner', 'manager', 'support'] },
  { prefix: '/dashboard/customers', roles: ['owner', 'manager', 'support'] },
  { prefix: '/dashboard/notifications', roles: ['owner', 'manager', 'support'] },
  { prefix: '/dashboard', roles: ['owner', 'manager'] }
];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface p-6">
        <div className="w-full max-w-sm space-y-3">
          <Skeleton className="h-12 w-12" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  const access = routeRoles.find((route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`));
  if (access && !access.roles.includes(user.role)) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface p-6 text-ink">
        <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6">
          <p className="text-sm font-bold uppercase tracking-wide text-royal">Unauthorized</p>
          <h1 className="mt-2 text-2xl font-black">This area is not available for your role.</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Your session is active, but this page needs a higher operations role.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
