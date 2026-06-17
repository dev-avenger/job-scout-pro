import { useAuthStore } from '../stores/auth-store';

const BASE_URL = '/api/v1';

/** Single-flight token refresh shared across concurrent 401s. */
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshTokens(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const { refreshToken, setTokens, logout } = useAuthStore.getState();
    if (!refreshToken) {
      logout();
      return false;
    }
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        logout();
        return false;
      }
      const data = (await res.json()) as { accessToken: string; refreshToken?: string };
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      logout();
      return false;
    } finally {
      // Allow the next expiry to trigger a fresh refresh
      setTimeout(() => {
        refreshPromise = null;
      }, 0);
    }
  })();

  return refreshPromise;
}

class ApiClient {
  async fetch<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    const token = useAuthStore.getState().accessToken;
    const headers: Record<string, string> = {
      // Fastify rejects requests that declare a JSON content-type with an
      // empty body, so only set it when a body is actually present.
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Access tokens expire after 15 minutes — refresh once and retry
      if (!isRetry && (await tryRefreshTokens())) {
        return this.fetch<T>(path, options, true);
      }
      useAuthStore.getState().logout();
      throw new Error('Your session expired — please sign in again.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  get<T>(path: string) {
    return this.fetch<T>(path);
  }

  post<T>(path: string, body?: unknown) {
    return this.fetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  }

  put<T>(path: string, body?: unknown) {
    return this.fetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
  }

  delete<T>(path: string) {
    return this.fetch<T>(path, { method: 'DELETE' });
  }

  async downloadBlob(
    path: string,
    filename: string,
    options?: { method?: string; body?: unknown },
    isRetry = false,
  ): Promise<void> {
    const token = useAuthStore.getState().accessToken;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (options?.body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await window.fetch(`${BASE_URL}${path}`, {
      method: options?.method ?? 'GET',
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401) {
      if (!isRetry && (await tryRefreshTokens())) {
        return this.downloadBlob(path, filename, options, true);
      }
      useAuthStore.getState().logout();
      throw new Error('Your session expired — please sign in again.');
    }

    if (!response.ok) {
      throw new Error(`Export failed: HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const apiClient = new ApiClient();
