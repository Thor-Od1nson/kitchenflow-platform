'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AuthResponse, AuthTokens, AuthUser } from '@kitchenflow/types';
import { authApi } from '@/lib/api-client';
import { clearStoredTokens, getStoredTokens, persistTokens } from '@/lib/auth-storage';

interface AuthContextValue {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthResponse | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const applySession = useCallback((session: AuthResponse) => {
    const nextTokens = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken
    };
    persistTokens(nextTokens);
    setTokens(nextTokens);
    setUser(session.user);
  }, []);

  const clearSession = useCallback(() => {
    clearStoredTokens();
    setTokens(null);
    setUser(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const stored = getStoredTokens();
    if (!stored) return null;
    const session = await authApi.refresh(stored);
    applySession(session);
    return session;
  }, [applySession]);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const stored = getStoredTokens();
      if (!stored) {
        if (mounted) setIsLoading(false);
        return;
      }

      setTokens(stored);
      try {
        const currentUser = await authApi.me();
        if (mounted) setUser(currentUser);
      } catch {
        try {
          const session = await refreshSession();
          if (mounted && session) setUser(session.user);
        } catch {
          clearSession();
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void loadSession();
    return () => {
      mounted = false;
    };
  }, [clearSession, refreshSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login(email, password);
      applySession(session);
      router.replace('/dashboard');
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
      router.replace('/dashboard');
    }
  }, [isLoading, pathname, router, user]);

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
