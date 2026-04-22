import { create } from "zustand";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    FirebaseError,
} from "firebase/auth";
import { auth } from "../services/firebase";
import { createUserDocument, fetchUserDocument } from "../services/userService";

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
    isInitializing: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    setLoading: (val: boolean) => void;
    initializeAuth: () => () => void;
}

const friendlyError = (err: unknown): string => {
    if (!(err instanceof FirebaseError)) return "Une erreur est survenue.";
    switch (err.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
              return "Email ou mot de passe incorrect.";
      case "auth/email-already-in-use":
              return "Cet email est deja utilise.";
      case "auth/weak-password":
              return "Mot de passe trop faible (6 caracteres minimum).";
      case "auth/invalid-email":
              return "Adresse email invalide.";
      case "auth/network-request-failed":
              return "Erreur reseau. Verifie ta connexion.";
      case "auth/too-many-requests":
              return "Trop de tentatives. Reessaie plus tard.";
      default:
              return err.message ?? "Une erreur est survenue.";
    }
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    isInitializing: true,

    setLoading: (val) => set({ isLoading: val }),

    // Ecoute la session Firebase au demarrage de l'app
    initializeAuth: () => {
          const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                  if (firebaseUser) {
                            try {
                                        const userData = await fetchUserDocument(firebaseUser.uid);
                                        set({ user: userData, isAuthenticated: true, isInitializing: false });
                            } catch {
                                        set({ user: null, isAuthenticated: false, isInitializing: false });
                            }
                  } else {
                            set({ user: null, isAuthenticated: false, isInitializing: false });
                  }
          });
          return unsubscribe;
    },

    login: async (email, password) => {
          set({ isLoading: true });
          try {
                  const { user: fbUser } = await signInWithEmailAndPassword(auth, email, password);
                  const userData = await fetchUserDocument(fbUser.uid);
                  set({ user: userData, isAuthenticated: true, isLoading: false });
          } catch (err) {
                  set({ isLoading: false });
                  throw new Error(friendlyError(err));
          }
    },

    signup: async (name, email, password) => {
          set({ isLoading: true });
          try {
                  const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password);
                  const userData = await createUserDocument(fbUser.uid, name, email);
                  set({ user: userData, isAuthenticated: true, isLoading: false });
          } catch (err) {
                  set({ isLoading: false });
                  throw new Error(friendlyError(err));
          }
    },

    logout: async () => {
          await signOut(auth);
          set({ user: null, isAuthenticated: false });
    },
}));
