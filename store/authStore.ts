// store/authStore.ts
import { create } from "zustand";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload,
  User,
} from "firebase/auth";
import app from "../src/config/firebase";

const auth = getAuth(app);

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  initialize: () => () => void;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, isInitialized: true });
    });
    return unsubscribe;
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Bloquer si email non vérifié
      if (!cred.user.emailVerified) {
        await signOut(auth);
        set({ isLoading: false, error: "email_not_verified" });
        throw new Error("email_not_verified");
      }
      set({ isLoading: false });
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      throw e;
    }
  },

  signup: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Envoyer email de vérification
      await sendEmailVerification(cred.user);
      // Déconnecter jusqu'à vérification
      await signOut(auth);
      set({ isLoading: false });
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      throw e;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await signOut(auth);
      set({ user: null, isLoading: false });
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },

  sendVerificationEmail: async () => {
    set({ isLoading: true, error: null });
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await sendEmailVerification(currentUser);
      }
      set({ isLoading: false });
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      throw e;
    }
  },

  reloadUser: async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await reload(currentUser);
        set({ user: auth.currentUser });
      }
    } catch (e: any) {
      console.log("reloadUser error:", e);
    }
  },

  clearError: () => set({ error: null }),
}));