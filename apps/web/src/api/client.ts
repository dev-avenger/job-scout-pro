import { useAuthStore } from '../stores/auth-store';

const BASE_URL = '/api/v1';

class ApiClient {
  async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = useAuthStore.getState().accessToken;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
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
      useAuthStore.getState().logout();
      throw new Error('Unauthorized');
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
}

export const apiClient = new ApiClient();
