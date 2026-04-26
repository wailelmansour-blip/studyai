// store/usageStore.ts
import { create } from "zustand";
import {
  doc, getDoc, setDoc, updateDoc,
  increment, getFirestore,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { UsageRecord, UserPlan, LIMITS } from "../types/usage";

const getTodayDate = () => new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

interface UsageState {
  usage: UsageRecord | null;
  isLoading: boolean;
  // Charge l'usage du jour depuis Firestore
  loadUsage: () => Promise<void>;
  // Vérifie si l'utilisateur peut encore faire une requête
  canMakeRequest: () => boolean;
  // Incrémente le compteur ET bloque si dépassé (retourne true si OK)
  consumeRequest: () => Promise<boolean>;
  // Upgrade vers premium (admin uniquement en prod, ici direct pour démo)
  upgradeToPremium: () => Promise<void>;
  // Reset pour les tests
  resetUsageForTest: () => Promise<void>;
}

export const useUsageStore = create<UsageState>((set, get) => ({
  usage: null,
  isLoading: false,

  loadUsage: async () => {
    const app = getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;

    set({ isLoading: true });
    try {
      const today = getTodayDate();
      const ref = doc(db, "usage", `${user.uid}_${today}`);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        set({ usage: snap.data() as UsageRecord });
      } else {
        // Premier accès aujourd'hui → créer le document
        // Récupère le plan depuis users/{uid}
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const plan: UserPlan = userSnap.exists()
          ? (userSnap.data().plan as UserPlan) || "free"
          : "free";

        const newRecord: UsageRecord = {
          userId: user.uid,
          date: today,
          count: 0,
          plan,
          updatedAt: new Date().toISOString(),
        };
        await setDoc(ref, newRecord);
        set({ usage: newRecord });
      }
    } catch (e) {
      console.error("loadUsage error:", e);
    } finally {
      set({ isLoading: false });
    }
  },

  canMakeRequest: () => {
    const { usage } = get();
    if (!usage) return false;
    const limit = LIMITS[usage.plan];
    return usage.count < limit;
  },

  consumeRequest: async () => {
    const app = getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return false;

    // Recharger l'usage pour avoir la valeur fraîche
    await get().loadUsage();
    const { usage } = get();
    if (!usage) return false;

    const limit = LIMITS[usage.plan];
    if (usage.count >= limit) return false; // bloqué

    // Incrémenter dans Firestore
    const today = getTodayDate();
    const ref = doc(db, "usage", `${user.uid}_${today}`);
    await updateDoc(ref, {
      count: increment(1),
      updatedAt: new Date().toISOString(),
    });

    // Mettre à jour le state local
    set({
      usage: { ...usage, count: usage.count + 1, updatedAt: new Date().toISOString() },
    });

    return true;
  },

  upgradeToPremium: async () => {
    const app = getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;

    const today = getTodayDate();
    // Mettre à jour le plan dans users/{uid}
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { plan: "premium" }, { merge: true });

    // Mettre à jour l'enregistrement usage du jour
    const usageRef = doc(db, "usage", `${user.uid}_${today}`);
    await updateDoc(usageRef, { plan: "premium" }).catch(() => {
      // Si le doc du jour n'existe pas encore, on le crée
      setDoc(usageRef, {
        userId: user.uid,
        date: today,
        count: 0,
        plan: "premium",
        updatedAt: new Date().toISOString(),
      });
    });

    const { usage } = get();
    if (usage) {
      set({ usage: { ...usage, plan: "premium" } });
    }
  },

  resetUsageForTest: async () => {
    const app = getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;

    const today = getTodayDate();
    const ref = doc(db, "usage", `${user.uid}_${today}`);
    await updateDoc(ref, { count: 0, updatedAt: new Date().toISOString() });
    const { usage } = get();
    if (usage) set({ usage: { ...usage, count: 0 } });
  },
}));
