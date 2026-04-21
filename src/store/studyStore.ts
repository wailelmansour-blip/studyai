import { create } from "zustand";

export interface StudySession {
  id: string;
  subject: string;
  duration: number; // minutes
  date: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  progress: number; // 0-100
  totalCards: number;
}

interface StudyState {
  sessions: StudySession[];
  subjects: Subject[];
  activeSubject: Subject | null;
  setActiveSubject: (subject: Subject | null) => void;
  addSession: (session: StudySession) => void;
}

const MOCK_SUBJECTS: Subject[] = [
  { id: "1", name: "Mathematics", color: "#6366f1", progress: 72, totalCards: 120 },
  { id: "2", name: "Physics", color: "#ec4899", progress: 45, totalCards: 88 },
  { id: "3", name: "Chemistry", color: "#10b981", progress: 60, totalCards: 95 },
  { id: "4", name: "History", color: "#f59e0b", progress: 30, totalCards: 64 },
];

export const useStudyStore = create<StudyState>((set) => ({
  sessions: [],
  subjects: MOCK_SUBJECTS,
  activeSubject: null,

  setActiveSubject: (subject) => set({ activeSubject: subject }),

  addSession: (session) =>
    set((state) => ({ sessions: [session, ...state.sessions] })),
}));
