import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; email: string; autonomyMode: string; onboardingCompleted: boolean } | null;
  isAuthenticated: boolean;
  /** refreshToken is optional so existing callers keep the stored one. */
  setAuth: (token: string, user: AuthState['user'], refreshToken?: string) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  markOnboardingCompleted: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setAuth: (accessToken, user, refreshToken) =>
        set((state) => ({
          accessToken,
          user,
          isAuthenticated: true,
          refreshToken: refreshToken ?? state.refreshToken,
        })),
      setTokens: (accessToken, refreshToken) =>
        set((state) => ({
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
        })),
      markOnboardingCompleted: () =>
        set((state) => ({
          user: state.user ? { ...state.user, onboardingCompleted: true } : state.user,
        })),
      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' },
  ),
);
