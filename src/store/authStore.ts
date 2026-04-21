import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  studyStreak: number;
  totalPoints: number;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setLoading: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  setLoading: (val) => set({ isLoading: val }),

  login: async (email, _password) => {
    set({ isLoading: true });
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    set({
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: "u_001",
        name: email.split("@")[0],
        email,
        studyStreak: 7,
        totalPoints: 1240,
      },
    });
  },

  signup: async (name, email, _password) => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 1200));
    set({
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: "u_002",
        name,
        email,
        studyStreak: 0,
        totalPoints: 0,
      },
    });
  },

  logout: () => set({ user: null, isAuthenticated: false }),
}));
