'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AuthResponse, AuthTokens, AuthUser } from '@kitchenflow/types';
import { authApi } from '@/lib/api-client';
import { clearStoredTokens, getStoredTokens, getStoredUser, persistTokens, persistUser, subscribeToAuthStorage } from '@/lib/auth-storage';
import { canAccessRoute, getDefaultRouteByRole } from '@/lib/rbac-routes';
import { useOpsStore } from '@/store/ops-store';

interface AuthContextValue {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthResponse | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
const AUTH_BOOTSTRAP_TIMEOUT_MS = 8_000;

function withBootstrapTimeout<T>(promise: Promise<T>, fallback: T) {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      window.setTimeout(() => resolve(fallback), AUTH_BOOTSTRAP_TIMEOUT_MS);
    })
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const addNotification = useOpsStore((state) => state.addNotification);
  const hydratedOnce = useRef(false);
  const lastUserRef = useRef<AuthUser | null>(null);

  const applySession = useCallback((session: AuthResponse) => {
    const nextTokens = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken
    };
    persistTokens(nextTokens);
    persistUser(session.user);
    setTokens(nextTokens);
    setUser(session.user);
    hydratedOnce.current = true;
    lastUserRef.current = session.user;
  }, []);

  const clearSession = useCallback(() => {
    clearStoredTokens();
    setTokens(null);
    setUser(null);
    lastUserRef.current = null;
  }, []);

  const refreshSession = useCallback(async () => {
    const stored = getStoredTokens();
    if (!stored) return null;
    const session = await authApi.refresh(stored);
    applySession(session);
    return session;
  }, [applySession]);

  const hydrateSession = useCallback(async () => {
    const stored = getStoredTokens();
    if (!stored) {
      setTokens(null);
      setUser(null);
      lastUserRef.current = null;
      hydratedOnce.current = true;
      return null;
    }

    setTokens(stored);
    const cachedUser = getStoredUser();
    if (cachedUser) {
      setUser(cachedUser);
      hydratedOnce.current = true;
      lastUserRef.current = cachedUser;
    }

    try {
      const currentUser = await withBootstrapTimeout(authApi.me(), cachedUser);
      if (!currentUser) {
        return null;
      }
      if (hydratedOnce.current && lastUserRef.current && (lastUserRef.current.id !== currentUser.id || lastUserRef.current.role !== currentUser.role)) {
        addNotification({
          id: `session_changed:${currentUser.id}:${currentUser.role}`,
          type: 'activity',
          title: 'Session changed',
          detail: `This tab is now signed in as ${currentUser.fullName} (${currentUser.role}).`,
          tone: 'neutral'
        });
      }
      hydratedOnce.current = true;
      lastUserRef.current = currentUser;
      setUser(currentUser);
      return currentUser;
    } catch {
      if (cachedUser) {
        return cachedUser;
      }
      try {
        const session = await withBootstrapTimeout(refreshSession(), null);
        if (session?.user) {
          hydratedOnce.current = true;
          lastUserRef.current = session.user;
        }
        return session?.user ?? null;
      } catch {
        clearSession();
        return null;
      }
    }
  }, [addNotification, refreshSession]);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        await hydrateSession();
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void loadSession();
    return () => {
      mounted = false;
    };
  }, [hydrateSession]);

  useEffect(() => {
    let syncInFlight = false;
    return subscribeToAuthStorage(() => {
      if (syncInFlight) return;
      syncInFlight = true;
      window.setTimeout(() => {
        void hydrateSession().finally(() => {
          syncInFlight = false;
        });
      }, 50);
    });
  }, [hydrateSession]);

  useEffect(() => {
    function handleSessionExpired() {
      clearSession();
      router.replace('/login?reason=session-expired');
    }

    window.addEventListener('kitchenflow:session-expired', handleSessionExpired);
    return () => window.removeEventListener('kitchenflow:session-expired', handleSessionExpired);
  }, [clearSession, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login(email, password);
      applySession(session);
      setIsLoading(false);
      router.replace(getDefaultRouteByRole(session.user.role));
    },
    [applySession, router]
  );

  const logout = useCallback(async () => {
    const refreshToken = getStoredTokens()?.refreshToken;
    clearSession();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Local session is already cleared; failed server revocation should not trap the user.
      }
    }
    router.replace('/login');
  }, [clearSession, router]);

  useEffect(() => {
    if (!isLoading && user && pathname === '/login') {
      router.replace(getDefaultRouteByRole(user.role));
    }
  }, [isLoading, pathname, router, user]);

  useEffect(() => {
    if (!isLoading && user && pathname.startsWith('/dashboard') && !canAccessRoute(user.role, pathname)) {
      router.replace(getDefaultRouteByRole(user.role));
    }
  }, [isLoading, pathname, router, user]);

  useEffect(() => {
    if (!user) return;
    let lastActivity = Date.now();
    const markActivity = () => {
      lastActivity = Date.now();
    };
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity > INACTIVITY_LIMIT_MS) {
        void logout();
      }
    }, 60_000);
    window.addEventListener('keydown', markActivity);
    window.addEventListener('pointerdown', markActivity);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('keydown', markActivity);
      window.removeEventListener('pointerdown', markActivity);
    };
  }, [logout, user]);

  const value = useMemo(
    () => ({ user, tokens, isLoading, login, logout, refreshSession }),
    [isLoading, login, logout, refreshSession, tokens, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
