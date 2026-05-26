'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  ClipboardList,
  Boxes,
  Bot,
  BrainCircuit,
  Building2,
  Gauge,
  ChevronDown,
  Command,
  Flame,
  Globe2,
  Home,
  Landmark,
  MessageSquareWarning,
  LogOut,
  MenuSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Search,
  Settings,
  ShieldCheck,
  Store,
  UserCheck,
  Users,
  Utensils,
  WalletCards,
  Workflow,
  X
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@kitchenflow/ui';
import type { Role } from '@kitchenflow/types';
import { useAuth } from '@/components/auth/auth-provider';
import { useOperationsSocket } from '@/hooks/use-operations-socket';
import { useOpsStore } from '@/store/ops-store';

const nav: Array<{ href: string; label: string; icon: typeof Home; roles: Role[] }> = [
  { href: '/dashboard', label: 'Overview', icon: Home, roles: ['owner', 'manager'] },
  { href: '/dashboard/executive', label: 'Executive', icon: Building2, roles: ['owner', 'manager'] },
  { href: '/dashboard/boardroom', label: 'Boardroom', icon: Landmark, roles: ['owner', 'manager'] },
  { href: '/dashboard/optimization', label: 'Optimization', icon: BarChart3, roles: ['owner', 'manager'] },
  { href: '/dashboard/planning', label: 'Planning', icon: Landmark, roles: ['owner', 'manager'] },
  { href: '/dashboard/control-center', label: 'Control center', icon: Gauge, roles: ['owner'] },
  { href: '/dashboard/mission-control', label: 'Live wallboard', icon: Gauge, roles: ['owner', 'manager'] },
  { href: '/dashboard/operations-fabric', label: 'Workflows', icon: Workflow, roles: ['owner', 'manager', 'support'] },
  { href: '/dashboard/consciousness', label: 'Enterprise pulse', icon: Gauge, roles: ['owner', 'manager'] },
  { href: '/dashboard/intelligence-mesh', label: 'Dependencies', icon: Workflow, roles: ['owner', 'manager', 'support'] },
  { href: '/dashboard/digital-twin', label: 'Outlet model', icon: BarChart3, roles: ['owner', 'manager'] },
  { href: '/dashboard/network', label: 'Network', icon: Globe2, roles: ['owner', 'manager', 'support'] },
  { href: '/dashboard/scenarios', label: 'Scenarios', icon: BarChart3, roles: ['owner', 'manager'] },
  { href: '/dashboard/automation', label: 'Automation', icon: Workflow, roles: ['owner', 'manager'] },
  { href: '/dashboard/incidents', label: 'Incidents', icon: MessageSquareWarning, roles: ['owner', 'manager', 'support'] },
  { href: '/dashboard/orders', label: 'Orders', icon: Command, roles: ['owner', 'manager', 'kitchen', 'support'] },
  { href: '/dashboard/menus', label: 'Menus', icon: MenuSquare, roles: ['owner', 'manager', 'support'] },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Boxes, roles: ['owner', 'manager', 'support'] },
  { href: '/dashboard/integrations', label: 'Integrations', icon: Plug, roles: ['owner', 'manager'] },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, roles: ['owner', 'manager', 'support'] },
  { href: '/dashboard/copilot', label: 'Ops advisor', icon: Bot, roles: ['owner', 'manager', 'support'] },
  { href: '/dashboard/finance', label: 'Finance ops', icon: WalletCards, roles: ['owner', 'manager'] },
  { href: '/dashboard/economics', label: 'Economics', icon: WalletCards, roles: ['owner', 'manager'] },
  { href: '/dashboard/customers', label: 'Customers', icon: Users, roles: ['owner', 'manager', 'support'] },
  { href: '/dashboard/workforce', label: 'Workforce', icon: Users, roles: ['owner', 'manager'] },
  { href: '/dashboard/collaboration', label: 'Approvals', icon: UserCheck, roles: ['owner', 'manager', 'support'] },
  { href: '/dashboard/stores', label: 'Stores', icon: Store, roles: ['owner', 'manager'] },
  { href: '/dashboard/knowledge', label: 'Knowledge', icon: ClipboardList, roles: ['owner', 'manager', 'support'] },
  { href: '/dashboard/temporal', label: 'Seasonality', icon: ClipboardList, roles: ['owner', 'manager', 'support'] },
  { href: '/dashboard/governance', label: 'Governance', icon: ShieldCheck, roles: ['owner'] },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, roles: ['owner', 'manager', 'support'] },
  { href: '/dashboard/audit', label: 'Audit log', icon: ClipboardList, roles: ['owner', 'manager', 'support'] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['owner'] }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const { darkMode, toggleDarkMode } = useOpsStore();
  const notifications = useOpsStore((state) => state.notifications);
  const socketStatus = useOpsStore((state) => state.socketStatus);
  const dismissNotification = useOpsStore((state) => state.dismissNotification);
  const cleanupExpiredNotifications = useOpsStore((state) => state.cleanupExpiredNotifications);
  const hydrateNotifications = useOpsStore((state) => state.hydrateNotifications);
  const markAllRead = useOpsStore((state) => state.markAllRead);
  const { user, logout } = useAuth();

  const visibleNav = nav.filter((item) => user && item.roles.includes(user.role));
  const activeNav = visibleNav.find((item) => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)));
  const visibleMobileNav = visibleNav.filter((item) => ['/dashboard', '/dashboard/orders', '/dashboard/analytics', '/dashboard/inventory'].includes(item.href)).slice(0, 4);

  useOperationsSocket();

  useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode);
  }, [darkMode]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    cleanupExpiredNotifications();
    const timers = notifications.slice(0, 4).map((notification) => {
      const expiresIn = Math.max(250, Date.parse(notification.createdAt) + 4_000 - Date.now());
      return window.setTimeout(() => dismissNotification(notification.id), expiresIn);
    });
    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [cleanupExpiredNotifications, dismissNotification, notifications, pathname]);

  useEffect(() => {
    hydrateNotifications();
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'kitchenflow.notifications') hydrateNotifications();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [hydrateNotifications]);

  return (
    <div className="noise min-h-screen bg-surface text-ink">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden border-r border-line bg-panel/90 px-3 py-5 shadow-luxe backdrop-blur-2xl transition-all duration-300 lg:block ${collapsed ? 'w-24' : 'w-72'}`}>
        <div className="flex items-center justify-between gap-2 px-2">
        <Link href="/" className="flex min-w-0 items-center gap-3 text-lg font-black">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-royal text-slate-950 shadow-soft">
            <Utensils className="size-5" />
          </span>
          <span className={collapsed ? 'sr-only' : 'truncate'}>KitchenFlow</span>
        </Link>
          <button
            className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-panel-muted hover:text-ink"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        <div className={`mt-6 rounded-2xl border border-line bg-panel-muted/80 p-3 ${collapsed ? 'px-2' : ''}`}>
          <div className="flex items-center justify-between gap-3">
            <div className={collapsed ? 'sr-only' : 'min-w-0'}>
              <p className="truncate text-sm font-bold">
                {user?.restaurant?.name ?? 'Restaurant'}
              </p>

              <p className="truncate text-xs text-muted">
                {user?.restaurant?.outlets?.length ?? 0} outlets -{' '}
                {user?.role?.replace('_', ' ') ?? 'user'}
              </p>
            </div>

            {collapsed ? (
              <span className="mx-auto grid size-9 place-items-center rounded-xl bg-royal/10 text-xs font-black text-royal">
                {user?.restaurant?.name?.slice(0, 2).toUpperCase() ?? 'KF'}
              </span>
            ) : (
              <ChevronDown className="size-4 shrink-0 text-muted" />
            )}
          </div>
        </div>

        <nav className="mt-6 space-y-1">
          {visibleNav.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'bg-royal text-slate-950 shadow-soft'
                    : 'text-muted hover:bg-panel-muted hover:text-ink'
                }`}
              >
                <item.icon className="size-4 shrink-0" />
                <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
                {!collapsed && item.href === '/dashboard/orders' && socketStatus === 'connected' ? (
                  <span className="ml-auto size-2 rounded-full bg-royal shadow-soft" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-4 bottom-5">
          <div className="mb-3 rounded-2xl border border-line bg-panel-muted/80 p-3">
            {collapsed ? (
              <p className="text-center text-sm font-black text-royal">{user?.fullName?.slice(0, 2).toUpperCase() ?? 'U'}</p>
            ) : (
              <>
            <p className="truncate text-sm font-bold">
              {user?.fullName ?? 'User'}
            </p>

            <p className="truncate text-xs text-muted">
              {user?.email ?? 'No email'}
            </p>
              </>
            )}
          </div>

          <Button
            className={collapsed ? 'w-full px-0' : 'w-full justify-start'}
            variant="secondary"
            size="sm"
            onClick={logout}
            aria-label="Logout"
          >
            <LogOut className="size-4" />
            <span className={collapsed ? 'sr-only' : ''}>Logout</span>
          </Button>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-24' : 'lg:pl-72'}`}>
        <header className="sticky top-0 z-20 border-b border-line bg-panel/80 px-4 py-3 shadow-soft backdrop-blur-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden min-w-0 lg:block">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-royal">{activeNav?.label ?? 'Dubai ops command'}</p>
              <p className="truncate text-sm font-semibold text-muted">
                {now.toLocaleDateString('en-AE', { weekday: 'long', month: 'short', day: '2-digit' })} - {now.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })} GST
              </p>
            </div>
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />

              <input
                className="h-10 w-full rounded-xl border border-line bg-panel-muted/80 pl-9 pr-3 text-sm outline-none transition focus:border-royal focus:ring-4 focus:ring-royal/10"
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

            {socketStatus !== 'connected' ? (
              <span className="hidden rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200 md:inline-flex">
                {socketStatus === 'reconnecting' ? 'Reconnecting' : 'Offline'}
              </span>
            ) : (
              <span className="hidden items-center gap-2 rounded-full border border-royal/30 bg-royal/10 px-3 py-1 text-xs font-bold text-royal md:inline-flex">
                <span className="live-pulse size-1.5 rounded-full bg-royal" />
                Live
              </span>
            )}

            {user && ['owner', 'manager', 'kitchen'].includes(user.role) ? (
              <Link href="/dashboard/orders">
                <Button size="sm">New order</Button>
              </Link>
            ) : null}
          </div>
          <div className="mt-3 hidden flex-wrap gap-2 xl:flex">
            {[
              ['Incident center', '/dashboard/control-center', '2'],
              ['Live wallboard', '/dashboard/mission-control', 'live'],
              ['Workflows', '/dashboard/operations-fabric', '8'],
              ['Optimization', '/dashboard/optimization', '4'],
              ['Outlet model', '/dashboard/digital-twin', '4'],
              ['Dependencies', '/dashboard/intelligence-mesh', '12'],
              ['Automation queue', '/dashboard/automation', '18'],
              ['SLA risk queue', '/dashboard/orders', '7'],
              ['Inventory forecast', '/dashboard/inventory', '12']
            ].map(([label, href, count]) => (
              <Link
                key={label}
                href={href}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-panel-muted/60 px-3 py-1 text-xs font-bold text-muted transition hover:border-royal/40 hover:text-ink"
              >
                <Flame className="size-3 text-royal" />
                {label}
                <span className="rounded-full bg-royal/10 px-2 py-0.5 text-royal">{count}</span>
              </Link>
            ))}
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 pb-24 pt-6 md:px-8 lg:pb-6">
          {children}
        </main>
      </div>
      <div className="pointer-events-none fixed right-4 top-20 z-50 hidden w-80 space-y-3 xl:block">
        <AnimatePresence initial={false}>
        {notifications.slice(0, 4).map((notification) => (
          <motion.div
            key={notification.id}
            layout
            initial={{ opacity: 0, x: 24, y: -8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 24, y: -8 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto rounded-xl border border-line bg-panel p-4 text-sm shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold">{notification.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {notification.detail}
                  {notification.groupCount && notification.groupCount > 1 ? ` (${notification.groupCount}x)` : ''}
                </p>
                {notification.actionUrl && notification.actionLabel ? (
                  <Link href={notification.actionUrl} className="mt-2 inline-flex text-xs font-bold text-royal" onClick={markAllRead}>
                    {notification.actionLabel}
                  </Link>
                ) : null}
              </div>
              <button
                className="grid size-7 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-panel-muted hover:text-ink"
                onClick={() => dismissNotification(notification.id)}
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
      {visibleMobileNav.length ? (
        <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-2xl border border-line bg-panel/95 p-1 shadow-luxe backdrop-blur-2xl lg:hidden">
          {visibleMobileNav.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-bold transition ${
                  active ? 'bg-royal text-slate-950 shadow-soft' : 'text-muted hover:bg-panel-muted hover:text-ink'
                }`}
              >
                <item.icon className="size-4" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
