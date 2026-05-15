'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  Command,
  Home,
  LogOut,
  MenuSquare,
  Moon,
  Plug,
  Search,
  Settings,
  Store,
  Users,
  Utensils
} from 'lucide-react';
import { Button } from '@kitchenflow/ui';
import type { Role } from '@kitchenflow/types';
import { useAuth } from '@/components/auth/auth-provider';
import { useOperationsSocket } from '@/hooks/use-operations-socket';
import { useOpsStore } from '@/store/ops-store';

const nav: Array<{ href: string; label: string; icon: typeof Home; roles: Role[] }> = [
  { href: '/dashboard', label: 'Overview', icon: Home, roles: ['owner', 'admin', 'ops_manager'] },
  { href: '/dashboard/orders', label: 'Orders', icon: Command, roles: ['owner', 'admin', 'ops_manager', 'store_manager', 'chef'] },
  { href: '/dashboard/menus', label: 'Menus', icon: MenuSquare, roles: ['owner', 'admin', 'ops_manager', 'store_manager'] },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Boxes, roles: ['owner', 'admin', 'ops_manager', 'store_manager'] },
  { href: '/dashboard/integrations', label: 'Integrations', icon: Plug, roles: ['owner', 'admin'] },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, roles: ['owner', 'admin', 'analyst'] },
  { href: '/dashboard/customers', label: 'Customers', icon: Users, roles: ['owner', 'admin', 'analyst'] },
  { href: '/dashboard/stores', label: 'Stores', icon: Store, roles: ['owner', 'admin', 'ops_manager'] },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, roles: ['owner', 'admin', 'ops_manager'] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['owner', 'admin'] }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { darkMode, toggleDarkMode } = useOpsStore();
  const { user, logout } = useAuth();

  const visibleNav = nav.filter((item) => user && item.roles.includes(user.role));

  useOperationsSocket();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-surface text-ink dark:bg-[#080b14] dark:text-white">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-line bg-white/95 px-4 py-5 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d111c]/95 lg:block">
        <Link href="/" className="flex items-center gap-3 px-2 text-lg font-black">
          <span className="grid size-10 place-items-center rounded-xl bg-ink text-white dark:bg-white dark:text-ink">
            <Utensils className="size-5" />
          </span>
          KitchenFlow
        </Link>

        <div className="mt-6 rounded-2xl border border-line bg-surface p-3 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {user?.restaurant?.name ?? 'Restaurant'}
              </p>

              <p className="truncate text-xs text-muted">
                {user?.restaurant?.outlets?.length ?? 0} outlets -{' '}
                {user?.role?.replace('_', ' ') ?? 'user'}
              </p>
            </div>

            <ChevronDown className="size-4 shrink-0 text-muted" />
          </div>
        </div>

        <nav className="mt-6 space-y-1">
          {visibleNav.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'bg-ink text-white dark:bg-white dark:text-ink'
                    : 'text-slate-600 hover:bg-surface hover:text-ink dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-4 bottom-5">
          <div className="mb-3 rounded-2xl border border-line bg-surface p-3 dark:border-white/10 dark:bg-white/5">
            <p className="truncate text-sm font-bold">
              {user?.fullName ?? 'User'}
            </p>

            <p className="truncate text-xs text-muted">
              {user?.email ?? 'No email'}
            </p>
          </div>

          <Button
            className="w-full justify-start"
            variant="secondary"
            size="sm"
            onClick={logout}
          >
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-line bg-white/85 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d111c]/85">
          <div className="flex items-center gap-3">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

              <input
                className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-royal focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5"
                placeholder="Search orders, menus, stores, integrations..."
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            >
              <Moon className="size-4" />
            </Button>

            <div className="hidden min-w-0 text-right md:block">
              <p className="truncate text-sm font-bold">
                {user?.fullName ?? 'User'}
              </p>

              <p className="truncate text-xs text-muted">
                {user?.role?.replace('_', ' ') ?? 'user'}
              </p>
            </div>

            <Button size="sm">New order</Button>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}