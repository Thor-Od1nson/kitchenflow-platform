'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, MoveRight } from 'lucide-react';
import { Button, Skeleton } from '@kitchenflow/ui';
import { getDefaultRouteByRole, getRouteAccess } from '@/lib/rbac-routes';
import { useAuth } from './auth-provider';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, logout, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  const access = getRouteAccess(pathname);
  const fallbackRoute = user ? getDefaultRouteByRole(user.role) : '/login';

  useEffect(() => {
    if (!isLoading && user && access && !access.roles.includes(user.role) && pathname !== fallbackRoute) {
      router.replace(fallbackRoute);
    }
  }, [access, fallbackRoute, isLoading, pathname, router, user]);

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

  if (access && !access.roles.includes(user.role)) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface p-6 text-ink">
        <div className="w-full max-w-md rounded-xl border border-line bg-panel p-6">
          <p className="text-sm font-bold uppercase tracking-wide text-royal">Unauthorized</p>
          <h1 className="mt-2 text-2xl font-black">This area is not available for your role.</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Your session is active. Move to your allowed workspace or sign out to switch accounts.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => router.replace(fallbackRoute)}>
              <MoveRight className="size-4" />
              Go to allowed workspace
            </Button>
            <Button variant="secondary" onClick={() => void logout()}>
              <LogOut className="size-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
