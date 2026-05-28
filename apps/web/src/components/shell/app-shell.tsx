'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Bot,
  Boxes,
  BrainCircuit,
  CalendarClock,
  Gauge,
  ChevronDown,
  ClipboardList,
  Command,
  DollarSign,
  GitBranch,
  Home,
  Landmark,
  MessageSquareWarning,
  LogOut,
  MenuSquare,
  Moon,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Utensils,
  Users,
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

type NavItem = { href: string; label: string; icon: typeof Home; roles: Role[] };
type NavSection = { label: string; items: NavItem[] };

const primaryNav: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: Home, roles: ['owner', 'manager'] },
  { href: '/dashboard/orders', label: 'Orders', icon: Command, roles: ['owner', 'manager', 'kitchen', 'support'] },
  { href: '/dashboard/control-center', label: 'Control Center', icon: Gauge, roles: ['owner'] },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Boxes, roles: ['owner', 'manager', 'support'] },
  { href: '/dashboard/integrations', label: 'Aggregators', icon: Plug, roles: ['owner', 'manager'] },
  { href: '/dashboard/finance', label: 'Finance', icon: WalletCards, roles: ['owner', 'manager'] },
  { href: '/dashboard/incidents', label: 'Incidents', icon: MessageSquareWarning, roles: ['owner', 'manager', 'support'] }
];

const workspaceGroups: NavSection[] = [
  {
    label: 'Intelligence',
    items: [
      { href: '/dashboard/optimization', label: 'Optimization', icon: BarChart3, roles: ['owner', 'manager'] },
      { href: '/dashboard/planning', label: 'Planning', icon: Landmark, roles: ['owner', 'manager'] },
      { href: '/dashboard/intelligence-mesh', label: 'Dependencies', icon: GitBranch, roles: ['owner', 'manager', 'support'] },
      { href: '/dashboard/operations-fabric', label: 'Workflows', icon: Workflow, roles: ['owner', 'manager', 'support'] },
      { href: '/dashboard/intelligence-mesh', label: 'Intelligence Mesh', icon: BrainCircuit, roles: ['owner', 'manager', 'support'] },
      { href: '/dashboard/analytics', label: 'Forecasting', icon: BarChart3, roles: ['owner', 'manager', 'support'] }
    ]
  },
  {
    label: 'Executive',
    items: [
      { href: '/dashboard/executive', label: 'Executive', icon: Gauge, roles: ['owner', 'manager'] },
      { href: '/dashboard/boardroom', label: 'Boardroom', icon: Landmark, roles: ['owner', 'manager'] },
      { href: '/dashboard/governance', label: 'Governance', icon: ShieldCheck, roles: ['owner'] },
      { href: '/dashboard/economics', label: 'Economics', icon: DollarSign, roles: ['owner', 'manager'] },
      { href: '/dashboard/scenarios', label: 'Scenarios', icon: CalendarClock, roles: ['owner', 'manager'] }
    ]
  },
  {
    label: 'Enterprise',
    items: [
      { href: '/dashboard/workforce', label: 'Workforce', icon: Users, roles: ['owner', 'manager'] },
      { href: '/dashboard/collaboration', label: 'Collaboration', icon: Users, roles: ['owner', 'manager', 'support'] },
      { href: '/dashboard/knowledge', label: 'Knowledge', icon: ClipboardList, roles: ['owner', 'manager', 'support'] },
      { href: '/dashboard/network', label: 'Network', icon: Network, roles: ['owner', 'manager', 'support'] },
      { href: '/dashboard/mission-control', label: 'Mission Control', icon: Gauge, roles: ['owner', 'manager'] }
    ]
  },
  {
    label: 'Advanced Systems',
    items: [
      { href: '/dashboard/digital-twin', label: 'Digital Twin', icon: BrainCircuit, roles: ['owner', 'manager'] },
      { href: '/dashboard/temporal', label: 'Temporal', icon: CalendarClock, roles: ['owner', 'manager', 'support'] },
      { href: '/dashboard/consciousness', label: 'Consciousness', icon: BrainCircuit, roles: ['owner', 'manager'] },
      { href: '/dashboard/automation', label: 'Automation', icon: Workflow, roles: ['owner', 'manager'] },
      { href: '/dashboard/operations-fabric', label: 'Operations Fabric', icon: GitBranch, roles: ['owner', 'manager', 'support'] }
    ]
  }
];

const overflowTools: NavSection[] = [
  {
    label: 'Operational Tools',
    items: [
      { href: '/dashboard/menus', label: 'Menus', icon: MenuSquare, roles: ['owner', 'manager', 'support'] },
      { href: '/dashboard/customers', label: 'Customers', icon: Users, roles: ['owner', 'manager', 'support'] },
      { href: '/dashboard/stores', label: 'Stores', icon: Store, roles: ['owner', 'manager'] },
      { href: '/dashboard/copilot', label: 'Ops Intelligence', icon: Bot, roles: ['owner', 'manager', 'support'] }
    ]
  },
  {
    label: 'Administration',
    items: [
      { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, roles: ['owner', 'manager', 'support'] },
      { href: '/dashboard/audit', label: 'Audit Log', icon: ClipboardList, roles: ['owner', 'manager', 'support'] },
      { href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['owner'] }
    ]
  }
];

const allNavItems = [
  ...primaryNav,
  ...workspaceGroups.flatMap((section) => section.items),
  ...overflowTools.flatMap((section) => section.items)
];

const roleLabels: Record<Role, string> = {
  owner: 'Regional Operations Director',
  manager: 'Operations Supervisor',
  kitchen: 'Aggregator Control Desk',
  support: 'Revenue Operations'
};

function workspaceName(name?: string) {
  if (!name || name.toLowerCase().includes('demo') || name === 'KitchenFlow GCC Brands') return 'GCC Operations Cluster';
  return name;
}

function roleLabel(role?: Role) {
  return role ? roleLabels[role] : 'Enterprise Workspace';
}

function topbarContext(pathname: string) {
  if (pathname.startsWith('/dashboard/orders')) {
    return {
      label: 'Orders workspace',
      search: 'Search active orders, customer, outlet...',
      actions: [
        { label: 'Queue metrics', href: '/dashboard/orders' },
        { label: 'Escalations', href: '/dashboard/incidents' }
      ]
    };
  }

  if (pathname.startsWith('/dashboard/finance') || pathname.startsWith('/dashboard/economics')) {
    return {
      label: 'Finance workspace',
      search: 'Search payouts, settlements, invoices...',
      actions: [
        { label: 'Payouts', href: '/dashboard/finance' },
        { label: 'Economics', href: '/dashboard/economics' }
      ]
    };
  }

  if (pathname.startsWith('/dashboard/executive') || pathname.startsWith('/dashboard/boardroom')) {
    return {
      label: 'Executive workspace',
      search: 'Search strategic briefs, regions, risks...',
      actions: [
        { label: 'Boardroom', href: '/dashboard/boardroom' },
        { label: 'Mission', href: '/dashboard/executive' }
      ]
    };
  }

  if (pathname.startsWith('/dashboard/analytics') || pathname.startsWith('/dashboard/optimization') || pathname.startsWith('/dashboard/planning')) {
    return {
      label: 'Intelligence workspace',
      search: 'Search analytics, forecasts, scenarios...',
      actions: [
        { label: 'Analytics', href: '/dashboard/analytics' },
        { label: 'Planning', href: '/dashboard/planning' }
      ]
    };
  }

  if (pathname.startsWith('/dashboard/network') || pathname.startsWith('/dashboard/integrations')) {
    return {
      label: 'Network workspace',
      search: 'Search regions, aggregators, corridors...',
      actions: [
        { label: 'Regions', href: '/dashboard/network' },
        { label: 'Aggregators', href: '/dashboard/integrations' }
      ]
    };
  }

  return {
    label: 'Operations workspace',
    search: 'Search orders, menus, stores, integrations...',
    actions: [] as Array<{ label: string; href: string }>
  };
}

const SIDEBAR_STATE_KEY = 'kitchenflow.sidebar.workspace-groups';

function readSidebarState() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(SIDEBAR_STATE_KEY) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
}

function navItemActive(pathname: string, item: NavItem) {
  return pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
}

function SidebarNavLink({
  item,
  active,
  collapsed,
  socketStatus
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  socketStatus?: string;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`group flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
        active ? 'bg-panel-muted text-ink ring-1 ring-line' : 'text-muted hover:bg-panel-muted hover:text-ink'
      }`}
    >
      <item.icon className="size-4 shrink-0" />
      <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
      {!collapsed && item.href === '/dashboard/orders' && socketStatus === 'connected' ? (
        <span className="ml-auto size-1.5 rounded-full bg-emerald-400" />
      ) : null}
    </Link>
  );
}

function SidebarSectionDropdown({
  section,
  pathname,
  collapsed,
  expanded,
  onToggle
}: {
  section: NavSection;
  pathname: string;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const sectionActive = section.items.some((item) => navItemActive(pathname, item));
  const visible = collapsed ? false : expanded;
  const SectionIcon = section.items[0]?.icon ?? ChevronDown;

  return (
    <div className="rounded-lg">
      <button
        className={`flex h-9 w-full items-center justify-between rounded-lg px-3 text-left text-xs font-bold uppercase tracking-[0.12em] transition ${
          sectionActive ? 'bg-panel-muted text-ink' : 'text-muted hover:bg-panel-muted hover:text-ink'
        }`}
        type="button"
        onClick={onToggle}
        title={collapsed ? section.label : undefined}
      >
        <span className={collapsed ? 'sr-only' : 'truncate'}>{section.label}</span>
        {collapsed ? <SectionIcon className="size-4 text-muted" /> : <ChevronDown className={`size-3 transition ${visible ? 'rotate-180' : ''}`} />}
      </button>
      <AnimatePresence initial={false}>
        {visible ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-1 max-h-64 space-y-1 overflow-y-auto border-l border-line/70 pl-2">
              {section.items.map((item) => (
                <SidebarNavLink key={`${section.label}-${item.label}-${item.href}`} item={item} active={navItemActive(pathname, item)} collapsed={false} />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function WorkspaceOverflowMenu({
  sections,
  pathname,
  role
}: {
  sections: NavSection[];
  pathname: string;
  role?: Role;
}) {
  const [open, setOpen] = useState(false);
  const visibleSections = sections
    .map((section) => ({ ...section, items: section.items.filter((item) => role && item.roles.includes(role)) }))
    .filter((section) => section.items.length);

  if (!visibleSections.length) return null;

  return (
    <div className="relative">
      <button
        className="flex h-9 w-full items-center justify-between rounded-lg border border-line bg-panel-muted/35 px-3 text-sm font-bold text-muted transition hover:bg-panel-muted hover:text-ink"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        More tools
        <ChevronDown className={`size-3 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="absolute bottom-11 left-0 z-50 max-h-80 w-full overflow-y-auto rounded-lg border border-line bg-panel p-2 shadow-none">
          {visibleSections.map((section) => (
            <div key={section.label} className="py-1">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{section.label}</p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={`${section.label}-${item.href}`}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition ${
                      navItemActive(pathname, item) ? 'bg-panel-muted text-ink' : 'text-muted hover:bg-panel-muted hover:text-ink'
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ContextualToolbar({
  actions,
  pathname
}: {
  actions: Array<{ label: string; href: string }>;
  pathname: string;
}) {
  const visibleActions = actions.slice(0, 2);
  if (!visibleActions.length) return null;

  return (
    <div className="hidden shrink-0 items-center gap-2 xl:flex">
      {visibleActions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-bold transition ${
            pathname === action.href ? 'border-line bg-panel-muted text-ink' : 'border-line bg-panel text-muted hover:bg-panel-muted hover:text-ink'
          }`}
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [sidebarStateReady, setSidebarStateReady] = useState(false);
  const { darkMode, toggleDarkMode } = useOpsStore();
  const notifications = useOpsStore((state) => state.notifications);
  const socketStatus = useOpsStore((state) => state.socketStatus);
  const dismissNotification = useOpsStore((state) => state.dismissNotification);
  const cleanupExpiredNotifications = useOpsStore((state) => state.cleanupExpiredNotifications);
  const hydrateNotifications = useOpsStore((state) => state.hydrateNotifications);
  const markAllRead = useOpsStore((state) => state.markAllRead);
  const { user, logout } = useAuth();

  const visiblePrimaryNav = primaryNav.filter((item) => user && item.roles.includes(user.role));
  const visibleWorkspaceGroups = workspaceGroups
    .map((section) => ({ ...section, items: section.items.filter((item) => user && item.roles.includes(user.role)) }))
    .filter((section) => section.items.length);
  const visibleNav = allNavItems.filter((item) => user && item.roles.includes(user.role));
  const activeNav = visibleNav.find((item) => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)));
  const visibleMobileNav = visiblePrimaryNav.filter((item) => ['/dashboard', '/dashboard/orders', '/dashboard/control-center', '/dashboard/inventory'].includes(item.href)).slice(0, 4);
  const context = topbarContext(pathname);

  useOperationsSocket();

  useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode);
  }, [darkMode]);

  useEffect(() => {
    setExpandedSections(readSidebarState());
    setSidebarStateReady(true);
  }, []);

  useEffect(() => {
    if (!sidebarStateReady) return;
    window.localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(expandedSections));
  }, [expandedSections, sidebarStateReady]);

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
      <aside className={`fixed inset-y-0 left-0 z-30 hidden border-r border-line bg-panel px-3 py-5 transition-all duration-300 lg:block ${collapsed ? 'w-24' : 'w-72'}`}>
        <div className="flex items-center justify-between gap-2 px-2">
        <Link href="/" className="flex min-w-0 items-center gap-3 text-lg font-black">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-royal/85 text-slate-950">
            <Utensils className="size-5" />
          </span>
          <span className={collapsed ? 'sr-only' : 'truncate'}>KitchenFlow</span>
        </Link>
          <button
            className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-panel-muted hover:text-ink"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        <div className={`mt-6 rounded-lg border border-line bg-panel-muted/45 p-3 ${collapsed ? 'px-2' : ''}`}>
          <div className="flex items-center justify-between gap-3">
            <div className={collapsed ? 'sr-only' : 'min-w-0'}>
              <p className="truncate text-sm font-bold">
                {workspaceName(user?.restaurant?.name)}
              </p>

              <p className="truncate text-xs text-muted">
                {user?.restaurant?.outlets?.length ?? 0} workspaces -{' '}
                {roleLabel(user?.role)}
              </p>
            </div>

            {collapsed ? (
              <span className="mx-auto grid size-9 place-items-center rounded-lg bg-panel text-xs font-black text-muted ring-1 ring-line">
                {workspaceName(user?.restaurant?.name).slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <ChevronDown className="size-4 shrink-0 text-muted" />
            )}
          </div>
        </div>

        <nav className="mt-6 max-h-[calc(100vh-18rem)] space-y-3 overflow-y-auto pr-1">
          <div className="space-y-1">
            {!collapsed ? (
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Primary Operations</p>
            ) : null}
            {visiblePrimaryNav.map((item) => (
              <SidebarNavLink
                key={item.href}
                item={item}
                active={navItemActive(pathname, item)}
                collapsed={collapsed}
                socketStatus={socketStatus}
              />
            ))}
          </div>

          <div className="space-y-1 border-t border-line/70 pt-3">
            {!collapsed ? (
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Workspace Groups</p>
            ) : null}
            {visibleWorkspaceGroups.map((section) => (
              <SidebarSectionDropdown
                key={section.label}
                section={section}
                pathname={pathname}
                collapsed={collapsed}
                expanded={Boolean(expandedSections[section.label])}
                onToggle={() => setExpandedSections((current) => ({ ...current, [section.label]: !current[section.label] }))}
              />
            ))}
          </div>
        </nav>

        <div className="absolute inset-x-4 bottom-5">
          <div className="mb-3 rounded-lg border border-line bg-panel-muted/45 p-3">
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
          {!collapsed ? (
            <div className="mt-3">
              <WorkspaceOverflowMenu sections={overflowTools} pathname={pathname} role={user?.role} />
            </div>
          ) : null}
        </div>
      </aside>

      <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-24' : 'lg:pl-72'}`}>
        <header className="sticky top-0 z-20 border-b border-line bg-panel/95 px-4 py-3 backdrop-blur-md">
          <div className="flex flex-nowrap items-center gap-3">
            <div className="hidden min-w-0 lg:block">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{context.label}</p>
              <p className="truncate text-sm font-semibold text-muted">
                {activeNav?.label ?? 'Dubai ops command'} - {now.toLocaleDateString('en-AE', { weekday: 'short', month: 'short', day: '2-digit' })} - {now.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })} GST
              </p>
            </div>
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />

              <input
                className="h-10 w-full rounded-lg border border-line bg-panel-muted/55 pl-9 pr-3 text-sm outline-none transition focus:border-royal focus:ring-2 focus:ring-royal/10"
                placeholder={context.search}
              />
            </div>

            <ContextualToolbar actions={context.actions} pathname={pathname} />

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
                {roleLabel(user?.role)}
              </p>
            </div>

            {socketStatus !== 'connected' ? (
              <span className="hidden rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200 md:inline-flex">
                {socketStatus === 'reconnecting' ? 'Reconnecting' : 'Offline'}
              </span>
            ) : (
              <span className="hidden items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300 md:inline-flex">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
            )}

            {user && ['owner', 'manager', 'kitchen'].includes(user.role) ? (
              <Link href="/dashboard/orders">
                <Button size="sm">New order</Button>
              </Link>
            ) : null}
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 pb-24 pt-5 md:px-7 lg:pb-7">
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
        <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-xl border border-line bg-panel/95 p-1 shadow-soft backdrop-blur-xl lg:hidden">
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
