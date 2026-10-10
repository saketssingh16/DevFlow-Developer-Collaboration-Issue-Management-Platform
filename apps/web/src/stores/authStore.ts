import { create } from 'zustand';

export interface UserState {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  emailVerified: boolean;
}

interface AuthStore {
  user: UserState | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: UserState, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (user, accessToken) =>
    set({
      user,
      accessToken,
      isAuthenticated: true
    }),
  setAccessToken: (accessToken) =>
    set({
      accessToken,
      isAuthenticated: true
    }),
  logout: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false
    })
}));
