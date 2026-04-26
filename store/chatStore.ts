// store/chatStore.ts
import { create } from "zustand";
import {
  collection, addDoc, updateDoc,
  doc, getDocs, query, where,
  orderBy, Timestamp, getFirestore,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { ChatSession, ChatMessage } from "../types/chat";

interface ChatState {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  isLoading: boolean;
  error: string | null;
  setCurrentSession: (session: ChatSession | null) => void;
  createSession: (userId: string, courseId: string, courseName: string) => Promise<string>;
  addMessage: (sessionId: string, message: ChatMessage) => Promise<void>;
  fetchSessions: (userId: string) => Promise<void>;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSession: null,
  isLoading: false,
  error: null,

  setCurrentSession: (session) => set({ currentSession: session }),

  createSession: async (userId, courseId, courseName) => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore(getApp());
      const session: ChatSession = {
        userId,
        courseId,
        courseName,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const ref = await addDoc(collection(db, "chatSessions"), {
        ...session,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      const newSession = { ...session, id: ref.id };
      set((s) => ({
        sessions: [newSession, ...s.sessions],
        currentSession: newSession,
        isLoading: false,
      }));
      return ref.id;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  addMessage: async (sessionId, message) => {
    try {
      const db = getFirestore(getApp());
      const current = get().currentSession;
      if (!current) return;

      const updatedMessages = [...current.messages, message];
      const updatedSession = { ...current, messages: updatedMessages };

      await updateDoc(doc(db, "chatSessions", sessionId), {
        messages: updatedMessages,
        updatedAt: Timestamp.now(),
      });

      set({ currentSession: updatedSession });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchSessions: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const db = getFirestore(getApp());
      const q = query(
        collection(db, "chatSessions"),
        where("userId", "==", userId),
        orderBy("updatedAt", "desc")
      );
      const snap = await getDocs(q);
      const sessions = snap.docs.map((d) => ({
        ...(d.data() as ChatSession),
        id: d.id,
      }));
      set({ sessions, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));