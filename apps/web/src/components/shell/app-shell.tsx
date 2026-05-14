'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  Command,
  Home,
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
import { useOpsStore } from '@/store/ops-store';
import { useEffect } from 'react';

const nav = [
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
  const { darkMode, toggleDarkMode, injectOrder } = useOpsStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const interval = window.setInterval(injectOrder, 9000);
    return () => window.clearInterval(interval);
  }, [injectOrder]);

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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Northstar Foods</p>
              <p className="text-xs text-muted">42 outlets · Owner</p>
            </div>
            <ChevronDown className="size-4 text-muted" />
          </div>
        </div>
        <nav className="mt-6 space-y-1">
          {nav.map((item) => {
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
            <Button variant="secondary" size="sm" onClick={toggleDarkMode} aria-label="Toggle dark mode">
              <Moon className="size-4" />
            </Button>
            <Button size="sm">New order</Button>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
