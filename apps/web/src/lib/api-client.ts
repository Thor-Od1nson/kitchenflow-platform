'use client';

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse, AuthTokens } from '@kitchenflow/types';
import { clearStoredTokens, getStoredTokens, persistTokens } from './auth-storage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

let refreshPromise: Promise<AuthResponse> | null = null;

function refreshTokens(refreshToken: string) {
  refreshPromise ??= axios
    .post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, { refreshToken })
    .then((response) => {
      persistTokens(response.data);
      return response.data;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tokens = getStoredTokens();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const tokens = getStoredTokens();

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || !tokens?.refreshToken) {
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;
      const refreshed = await refreshTokens(tokens.refreshToken);
      originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearStoredTokens();
      return Promise.reject(refreshError);
    }
  }
);

export const authApi = {
  async login(email: string, password: string) {
    const response = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/login`, { email, password });
    return response.data;
  },
  async me() {
    const response = await apiClient.get<AuthResponse['user']>('/auth/me');
    return response.data;
  },
  async refresh(tokens: AuthTokens) {
    return refreshTokens(tokens.refreshToken);
  },
  async logout(refreshToken: string) {
    await axios.post(`${API_BASE_URL}/auth/logout`, { refreshToken });
  }
};
