// store/aiStore.ts
import { create } from "zustand";
import { collection, addDoc, Timestamp, getFirestore } from "firebase/firestore";
import { getApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ExplainResult, SolveResult, FlashcardsResult } from "../types/ai";

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

// ── Helpers cache ──────────────────────────────────────────
const cacheSet = async (key: string, data: any) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({
      data, timestamp: Date.now(),
    }));
  } catch (e) {
    console.log("Cache set error:", e);
  }
};

const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
};

// ──────────────────────────────────────────────────────────
interface AiState {
  isLoading: boolean;
  error: string | null;
  cachedExplanations: ExplainResult[];
  cachedSolutions: SolveResult[];
  cachedFlashcards: FlashcardsResult[];
  saveExplanation: (data: ExplainResult) => Promise<string>;
  saveSolution: (data: SolveResult) => Promise<string>;
  saveFlashcards: (data: FlashcardsResult) => Promise<string>;
  loadCachedExplanations: (userId: string) => Promise<void>;
  loadCachedSolutions: (userId: string) => Promise<void>;
  loadCachedFlashcards: (userId: string) => Promise<void>;
  clearError: () => void;
}

export const useAiStore = create<AiState>((set) => ({
  isLoading: false,
  error: null,
  cachedExplanations: [],
  cachedSolutions: [],
  cachedFlashcards: [],

  saveExplanation: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore(getApp());
      const ref = await addDoc(collection(db, "explanations"), {
        ...data, createdAt: Timestamp.now(),
      });
      const saved = { ...data, id: ref.id };

      // Mettre à jour le cache
      const key = `studyai_explanations_${data.userId}`;
      const cached = await cacheGet<ExplainResult[]>(key) || [];
      await cacheSet(key, [saved, ...cached]);

      set((s) => ({
        cachedExplanations: [saved, ...s.cachedExplanations],
        isLoading: false,
      }));
      return ref.id;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  saveSolution: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore(getApp());
      const ref = await addDoc(collection(db, "solutions"), {
        ...data, createdAt: Timestamp.now(),
      });
      const saved = { ...data, id: ref.id };

      const key = `studyai_solutions_${data.userId}`;
      const cached = await cacheGet<SolveResult[]>(key) || [];
      await cacheSet(key, [saved, ...cached]);

      set((s) => ({
        cachedSolutions: [saved, ...s.cachedSolutions],
        isLoading: false,
      }));
      return ref.id;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  saveFlashcards: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore(getApp());
      const ref = await addDoc(collection(db, "flashcards"), {
        ...data, createdAt: Timestamp.now(),
      });
      const saved = { ...data, id: ref.id };

      const key = `studyai_flashcards_${data.userId}`;
      const cached = await cacheGet<FlashcardsResult[]>(key) || [];
      await cacheSet(key, [saved, ...cached]);

      set((s) => ({
        cachedFlashcards: [saved, ...s.cachedFlashcards],
        isLoading: false,
      }));
      return ref.id;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  loadCachedExplanations: async (userId) => {
    const data = await cacheGet<ExplainResult[]>(`studyai_explanations_${userId}`);
    if (data) set({ cachedExplanations: data });
  },

  loadCachedSolutions: async (userId) => {
    const data = await cacheGet<SolveResult[]>(`studyai_solutions_${userId}`);
    if (data) set({ cachedSolutions: data });
  },

  loadCachedFlashcards: async (userId) => {
    const data = await cacheGet<FlashcardsResult[]>(`studyai_flashcards_${userId}`);
    if (data) set({ cachedFlashcards: data });
  },

  clearError: () => set({ error: null }),
}));