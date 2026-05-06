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
import {
  getFirestore, doc, setDoc, getDoc,
} from "firebase/firestore";
import app from "../src/config/firebase";

const auth = getAuth(app);

const getFirebaseError = (code: string, lang: string): string => {
  const errors: Record<string, { fr: string; en: string; ar: string }> = {
    "auth/invalid-email": {
      fr: "Adresse email invalide.",
      en: "Invalid email address.",
      ar: "البريد الإلكتروني غير صالح.",
    },
    "auth/user-disabled": {
      fr: "Ce compte a été désactivé.",
      en: "This account has been disabled.",
      ar: "تم تعطيل هذا الحساب.",
    },
    "auth/user-not-found": {
      fr: "Aucun compte trouvé avec cet email.",
      en: "No account found with this email.",
      ar: "لا يوجد حساب بهذا البريد الإلكتروني.",
    },
    "auth/wrong-password": {
      fr: "Mot de passe incorrect.",
      en: "Incorrect password.",
      ar: "كلمة المرور غير صحيحة.",
    },
    "auth/email-already-in-use": {
      fr: "Un compte existe déjà avec cet email.",
      en: "An account already exists with this email.",
      ar: "يوجد حساب بهذا البريد الإلكتروني.",
    },
    "auth/weak-password": {
      fr: "Mot de passe trop faible. Minimum 6 caractères.",
      en: "Password too weak. Minimum 6 characters.",
      ar: "كلمة المرور ضعيفة جداً. 6 أحرف على الأقل.",
    },
    "auth/network-request-failed": {
      fr: "Erreur réseau. Vérifie ta connexion internet.",
      en: "Network error. Check your internet connection.",
      ar: "خطأ في الشبكة. تحقق من اتصالك بالإنترنت.",
    },
    "auth/too-many-requests": {
      fr: "Trop de tentatives. Réessaie dans quelques minutes.",
      en: "Too many attempts. Try again in a few minutes.",
      ar: "محاولات كثيرة جداً. حاول مجدداً بعد دقائق.",
    },
    "auth/invalid-credential": {
      fr: "Identifiants incorrects. Vérifie ton email et mot de passe.",
      en: "Invalid credentials. Check your email and password.",
      ar: "بيانات غير صحيحة. تحقق من بريدك وكلمة المرور.",
    },
    "auth/requires-recent-login": {
      fr: "Session expirée. Reconnecte-toi pour continuer.",
      en: "Session expired. Please sign in again.",
      ar: "انتهت الجلسة. سجّل دخولك مجدداً.",
    },
    "email_not_verified": {
      fr: "Email non vérifié.",
      en: "Email not verified.",
      ar: "البريد الإلكتروني غير مؤكد.",
    },
  };

  const entry = errors[code];
  if (!entry) {
    if (lang === "ar") return "حدث خطأ. حاول مجدداً.";
    if (lang === "en") return "An error occurred. Please try again.";
    return "Une erreur s'est produite. Réessaie.";
  }
  if (lang === "ar") return entry.ar;
  if (lang === "en") return entry.en;
  return entry.fr;
};

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  lastCreatedUid: string | null;
  firstName: string | null;
  setFirstName: (name: string) => void;
  login: (email: string, password: string, lang?: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    birthDate: string,
    lang?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  initialize: () => () => void;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  lastCreatedUid: null,
  firstName: null,

  setFirstName: (name) => set({ firstName: name }),

  initialize: () => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Charger le prénom dès que l'utilisateur est détecté
      try {
        const db = getFirestore(app);
        const snap = await getDoc(doc(db, "users", user.uid));
        const firstName = snap.exists() ? snap.data().firstName || null : null;
        set({ user, isInitialized: true, firstName });
      } catch {
        set({ user, isInitialized: true });
      }
    } else {
      set({ user: null, isInitialized: true, firstName: null });
    }
  });
  return unsubscribe;
},

  login: async (email, password, lang = "fr") => {
    set({ isLoading: true, error: null });
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        await signOut(auth);
        set({ isLoading: false, error: "email_not_verified" });
        throw new Error("email_not_verified");
      }
      // Charger le prénom immédiatement après login
      const db = getFirestore(app);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      const firstName = snap.exists() ? snap.data().firstName || null : null;
      set({ isLoading: false, firstName });
    } catch (e: any) {
      const msg = e.message === "email_not_verified"
        ? "email_not_verified"
        : getFirebaseError(e.code, lang);
      set({ isLoading: false, error: msg });
      throw e;
    }
  },

  signup: async (email, password, firstName, lastName, birthDate, lang = "fr") => {
    set({ isLoading: true, error: null });
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      const isChild = age < 13;

      const db = getFirestore(app);
      await setDoc(doc(db, "users", cred.user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate,
        age,
        email: email.trim().toLowerCase(),
        isChild,
        plan: "free",
        isVerified: false,
        parentalConsentStatus: isChild ? "pending" : null,
        createdAt: new Date().toISOString(),
      });

      const uid = cred.user.uid;
      await sendEmailVerification(cred.user);
      await signOut(auth);
      set({ isLoading: false, lastCreatedUid: uid });
    } catch (e: any) {
      const msg = getFirebaseError(e.code, lang);
      set({ isLoading: false, error: msg });
      throw e;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await signOut(auth);
      set({ user: null, isLoading: false, lastCreatedUid: null, firstName: null });
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },

  sendVerificationEmail: async () => {
    set({ isLoading: true, error: null });
    try {
      const currentUser = auth.currentUser;
      if (currentUser) await sendEmailVerification(currentUser);
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