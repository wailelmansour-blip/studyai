// store/planStore.ts
import { create } from "zustand";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { StudyPlan } from "@/types/plan";

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

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [],
  currentPlan: null,
  isLoading: false,
  error: null,

  setCurrentPlan: (plan) => set({ currentPlan: plan }),

  savePlan: async (plan: StudyPlan) => {
    set({ isLoading: true, error: null });
    try {
      const docRef = await addDoc(collection(db, "plans"), {
        ...plan,
        createdAt: Timestamp.now(),
      });
      const savedPlan = { ...plan, id: docRef.id };
      set((state) => ({
        plans: [savedPlan, ...state.plans],
        currentPlan: savedPlan,
        isLoading: false,
      }));
      return docRef.id;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchPlans: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const q = query(
        collection(db, "plans"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const plans: StudyPlan[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as StudyPlan),
        id: doc.id,
      }));
      set({ plans, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));