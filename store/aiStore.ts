// store/aiStore.ts
import { create } from "zustand";
import { collection, addDoc, Timestamp } from "firebase/firestore";
//import { db } from "@/lib/firebase";
import { ExplainResult, SolveResult, FlashcardsResult } from "../types/ai";
import { db } from "../src/lib/firebase";

interface AiState {
  isLoading: boolean;
  error: string | null;
  saveExplanation: (data: ExplainResult) => Promise<string>;
  saveSolution: (data: SolveResult) => Promise<string>;
  saveFlashcards: (data: FlashcardsResult) => Promise<string>;
  clearError: () => void;
}

export const useAiStore = create<AiState>((set) => ({
  isLoading: false,
  error: null,

  saveExplanation: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const ref = await addDoc(collection(db, "explanations"), {
        ...data,
        createdAt: Timestamp.now(),
      });
      set({ isLoading: false });
      return ref.id;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  saveSolution: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const ref = await addDoc(collection(db, "solutions"), {
        ...data,
        createdAt: Timestamp.now(),
      });
      set({ isLoading: false });
      return ref.id;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  saveFlashcards: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const ref = await addDoc(collection(db, "flashcards"), {
        ...data,
        createdAt: Timestamp.now(),
      });
      set({ isLoading: false });
      return ref.id;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));