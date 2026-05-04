import { create } from "zustand";
import { HistoryType } from "../hooks/useDeleteHistory";

interface HistoryState {
  refreshTrigger: Record<string, number>;
  triggerRefresh: (type: HistoryType) => void;
  triggerRefreshAll: () => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  refreshTrigger: {},

  triggerRefresh: (type) =>
    set((state) => ({
      refreshTrigger: {
        ...state.refreshTrigger,
        [type]: (state.refreshTrigger[type] || 0) + 1,
      },
    })),

  triggerRefreshAll: () =>
    set({
      refreshTrigger: {
        quizzes: Date.now(),
        flashcards: Date.now(),
        plans: Date.now(),
        summaries: Date.now(),
        explanations: Date.now(),
        solutions: Date.now(),
        chatSessions: Date.now(),
      },
    }),
}));