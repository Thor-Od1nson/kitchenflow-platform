import type { AuthTokens } from '@kitchenflow/types';

const ACCESS_TOKEN_KEY = 'kitchenflow.accessToken';
const REFRESH_TOKEN_KEY = 'kitchenflow.refreshToken';
const ACCESS_COOKIE = 'kf_access_token';
const REFRESH_COOKIE = 'kf_refresh_token';
const AUTH_SYNC_EVENT = 'kitchenflow:auth-storage';

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; sameSite=lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; sameSite=lax`;
}

export function getStoredTokens(): AuthTokens | null {
  if (typeof window === 'undefined') return null;
  const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function persistTokens(tokens: AuthTokens) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  setCookie(ACCESS_COOKIE, tokens.accessToken, 15 * 60);
  setCookie(REFRESH_COOKIE, tokens.refreshToken, 30 * 24 * 60 * 60);
  window.dispatchEvent(new Event(AUTH_SYNC_EVENT));
}

export function clearStoredTokens() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  clearCookie(ACCESS_COOKIE);
  clearCookie(REFRESH_COOKIE);
  window.dispatchEvent(new Event(AUTH_SYNC_EVENT));
}

export function subscribeToAuthStorage(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === ACCESS_TOKEN_KEY || event.key === REFRESH_TOKEN_KEY) callback();
  };
  window.addEventListener('storage', handleStorage);
  window.addEventListener(AUTH_SYNC_EVENT, callback);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(AUTH_SYNC_EVENT, callback);
  };
}
