// store/planStore.ts
import { create } from "zustand";
import {
  collection, addDoc, getDocs,
  query, where, orderBy, Timestamp,
  getFirestore,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StudyPlan } from "../types/plan";

const CACHE_KEY = "studyai_plans";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

interface PlanState {
  plans: StudyPlan[];
  currentPlan: StudyPlan | null;
  isLoading: boolean;
  isFromCache: boolean;
  error: string | null;
  setCurrentPlan: (plan: StudyPlan | null) => void;
  savePlan: (plan: StudyPlan) => Promise<string>;
  fetchPlans: (userId: string) => Promise<void>;
  clearError: () => void;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [],
  currentPlan: null,
  isLoading: false,
  isFromCache: false,
  error: null,

  setCurrentPlan: (plan) => set({ currentPlan: plan }),

  savePlan: async (plan) => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore(getApp());
      const ref = await addDoc(collection(db, "plans"), {
        ...plan,
        createdAt: Timestamp.now(),
      });
      const saved = { ...plan, id: ref.id };

      // Mettre à jour le cache local
      const cacheKey = `${CACHE_KEY}_${plan.userId}`;
      const existing = get().plans;
      const updated = [saved, ...existing];
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        data: updated,
        timestamp: Date.now(),
      }));

      set((s) => ({
        plans: [saved, ...s.plans],
        currentPlan: saved,
        isLoading: false,
      }));
      return ref.id;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  fetchPlans: async (userId: string) => {
    set({ isLoading: true, error: null });
    const cacheKey = `${CACHE_KEY}_${userId}`;

    try {
      // 1. Charger depuis le cache d'abord
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          set({ plans: data, isLoading: false, isFromCache: true });
        }
      }

      // 2. Sync Firebase en arrière-plan
      try {
        const db = getFirestore(getApp());
        const q = query(
          collection(db, "plans"),
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const plans = snap.docs.map((d) => ({
          ...(d.data() as StudyPlan),
          id: d.id,
        }));

        // Mettre à jour le cache avec données fraîches
        await AsyncStorage.setItem(cacheKey, JSON.stringify({
          data: plans,
          timestamp: Date.now(),
        }));

        set({ plans, isLoading: false, isFromCache: false });
      } catch (firebaseError: any) {
        // Firebase échoue mais cache dispo → pas d'erreur visible
        if (!cached) {
          set({ error: firebaseError.message, isLoading: false });
        } else {
          set({ isLoading: false });
        }
      }
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));