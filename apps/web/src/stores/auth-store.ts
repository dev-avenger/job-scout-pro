import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  user: { id: string; email: string; autonomyMode: string; onboardingCompleted: boolean } | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: AuthState['user']) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      setAuth: (accessToken, user) => set({ accessToken, user, isAuthenticated: true }),
      logout: () => set({ accessToken: null, user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' },
  ),
);
