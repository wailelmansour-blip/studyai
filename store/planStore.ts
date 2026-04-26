// store/planStore.ts
import { create } from "zustand";
import {
  collection, addDoc, getDocs,
  query, where, orderBy, Timestamp,
  getFirestore,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { StudyPlan } from "../types/plan";

interface PlanState {
  plans: StudyPlan[];
  currentPlan: StudyPlan | null;
  isLoading: boolean;
  error: string | null;
  setCurrentPlan: (plan: StudyPlan | null) => void;
  savePlan: (plan: StudyPlan) => Promise<string>;
  fetchPlans: (userId: string) => Promise<void>;
  clearError: () => void;
}

export const usePlanStore = create<PlanState>((set) => ({
  plans: [],
  currentPlan: null,
  isLoading: false,
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
      set((s) => ({ plans: [saved, ...s.plans], currentPlan: saved, isLoading: false }));
      return ref.id;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  fetchPlans: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore(getApp());
      const q = query(
        collection(db, "plans"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const plans = snap.docs.map((d) => ({ ...(d.data() as StudyPlan), id: d.id }));
      set({ plans, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));