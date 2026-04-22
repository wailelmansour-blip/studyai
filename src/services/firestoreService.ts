import {
  doc, collection, addDoc, getDoc, getDocs, updateDoc,
    deleteDoc, setDoc, serverTimestamp, query, orderBy, limit, Timestamp,
    } from "firebase/firestore";
    import { db } from "./firebase";

    // ─── TYPES ───────────────────────────────────────────────────────

    export type Plan = "free" | "pro" | "premium";

    export interface UserProfile {
      id: string;
        name: string;
          email: string;
            plan: Plan;
              dailyUsage: number;
                createdAt?: Timestamp;
                  updatedAt?: Timestamp;
                  }

                  export interface Note {
                    id: string;
                      content: string;
                        createdAt?: Timestamp;
                          updatedAt?: Timestamp;
                          }

                          export interface Summary {
                            id: string;
                              originalText: string;
                                summary: string;
                                  createdAt?: Timestamp;
                                  }

                                  export interface QuizQuestion {
                                    question: string;
                                      options: string[];
                                        correct: number;
                                        }

                                        export interface Quiz {
                                          id: string;
                                            questions: QuizQuestion[];
                                              score: number;
                                                subject?: string;
                                                  createdAt?: Timestamp;
                                                  }

                                                  export interface StudyPlan {
                                                    id: string;
                                                      plan: string;
                                                        subjects: string[];
                                                          createdAt?: Timestamp;
                                                            updatedAt?: Timestamp;
                                                            }

                                                            // ─── REFS ────────────────────────────────────────────────────────

                                                            const userDoc  = (uid: string) => doc(db, "users", uid);
                                                            const notesCol = (uid: string) => collection(db, "users", uid, "notes");
                                                            const noteDoc  = (uid: string, nid: string) => doc(db, "users", uid, "notes", nid);
                                                            const sumCol   = (uid: string) => collection(db, "users", uid, "summaries");
                                                            const sumDoc   = (uid: string, sid: string) => doc(db, "users", uid, "summaries", sid);
                                                            const quizCol  = (uid: string) => collection(db, "users", uid, "quizzes");
                                                            const quizDoc  = (uid: string, qid: string) => doc(db, "users", uid, "quizzes", qid);
                                                            const planCol  = (uid: string) => collection(db, "users", uid, "plans");
                                                            const planDoc  = (uid: string, pid: string) => doc(db, "users", uid, "plans", pid);

                                                            // ─── USERS ───────────────────────────────────────────────────────

                                                            export const createUser = async (uid: string, data: Pick<UserProfile, "name" | "email">): Promise<UserProfile> => {
                                                              const profile = { name: data.name, email: data.email, plan: "free" as Plan, dailyUsage: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
                                                                await setDoc(userDoc(uid), profile);
                                                                  return { id: uid, ...profile } as UserProfile;
                                                                  };

                                                                  export const getUser = async (uid: string): Promise<UserProfile | null> => {
                                                                    const snap = await getDoc(userDoc(uid));
                                                                      if (!snap.exists()) return null;
                                                                        return { id: snap.id, ...snap.data() } as UserProfile;
                                                                        };

                                                                        export const updateUser = async (uid: string, fields: Partial<Omit<UserProfile, "id" | "createdAt">>): Promise<void> => {
                                                                          await updateDoc(userDoc(uid), { ...fields, updatedAt: serverTimestamp() });
                                                                          };

                                                                          export const incrementDailyUsage = async (uid: string): Promise<void> => {
                                                                            const snap = await getDoc(userDoc(uid));
                                                                              if (!snap.exists()) return;
                                                                                const current = (snap.data().dailyUsage ?? 0) as number;
                                                                                  await updateDoc(userDoc(uid), { dailyUsage: current + 1, updatedAt: serverTimestamp() });
                                                                                  };

                                                                                  export const resetDailyUsage = async (uid: string): Promise<void> => {
                                                                                    await updateDoc(userDoc(uid), { dailyUsage: 0, updatedAt: serverTimestamp() });
                                                                                    };

                                                                                    // ─── NOTES ───────────────────────────────────────────────────────

                                                                                    export const createNote = async (uid: string, content: string): Promise<Note> => {
                                                                                      const ref = await addDoc(notesCol(uid), { content, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
                                                                                        return { id: ref.id, content };
                                                                                        };

                                                                                        export const getNote = async (uid: string, nid: string): Promise<Note | null> => {
                                                                                          const snap = await getDoc(noteDoc(uid, nid));
                                                                                            if (!snap.exists()) return null;
                                                                                              return { id: snap.id, ...snap.data() } as Note;
                                                                                              };

                                                                                              export const getNotes = async (uid: string, max = 50): Promise<Note[]> => {
                                                                                                const q = query(notesCol(uid), orderBy("createdAt", "desc"), limit(max));
                                                                                                  const snap = await getDocs(q);
                                                                                                    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Note));
                                                                                                    };
                                                                                                    
                                                                                                    export const updateNote = async (uid: string, nid: string, content: string): Promise<void> => {
                                                                                                      await updateDoc(noteDoc(uid, nid), { content, updatedAt: serverTimestamp() });
                                                                                                      };
                                                                                                      
                                                                                                      export const deleteNote = async (uid: string, nid: string): Promise<void> => {
                                                                                                        await deleteDoc(noteDoc(uid, nid));
                                                                                                        };
                                                                                                        
                                                                                                        // ─── SUMMARIES ───────────────────────────────────────────────────
                                                                                                        
                                                                                                        export const createSummary = async (uid: string, originalText: string, summary: string): Promise<Summary> => {
                                                                                                          const ref = await addDoc(sumCol(uid), { originalText, summary, createdAt: serverTimestamp() });
                                                                                                            return { id: ref.id, originalText, summary };
                                                                                                            };
                                                                                                            
                                                                                                            export const getSummary = async (uid: string, sid: string): Promise<Summary | null> => {
                                                                                                              const snap = await getDoc(sumDoc(uid, sid));
                                                                                                                if (!snap.exists()) return null;
                                                                                                                  return { id: snap.id, ...snap.data() } as Summary;
                                                                                                                  };
                                                                                                                  
                                                                                                                  export const getSummaries = async (uid: string, max = 30): Promise<Summary[]> => {
                                                                                                                    const q = query(sumCol(uid), orderBy("createdAt", "desc"), limit(max));
                                                                                                                      const snap = await getDocs(q);
                                                                                                                        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Summary));
                                                                                                                        };
                                                                                                                        
                                                                                                                        export const deleteSummary = async (uid: string, sid: string): Promise<void> => {
                                                                                                                          await deleteDoc(sumDoc(uid, sid));
                                                                                                                          };
                                                                                                                          
                                                                                                                          // ─── QUIZZES ─────────────────────────────────────────────────────
                                                                                                                          
                                                                                                                          export const createQuiz = async (uid: string, questions: QuizQuestion[], score: number, subject?: string): Promise<Quiz> => {
                                                                                                                            const ref = await addDoc(quizCol(uid), { questions, score, subject: subject ?? null, createdAt: serverTimestamp() });
                                                                                                                              return { id: ref.id, questions, score, subject };
                                                                                                                              };
                                                                                                                              
                                                                                                                              export const getQuiz = async (uid: string, qid: string): Promise<Quiz | null> => {
                                                                                                                                const snap = await getDoc(quizDoc(uid, qid));
                                                                                                                                  if (!snap.exists()) return null;
                                                                                                                                    return { id: snap.id, ...snap.data() } as Quiz;
                                                                                                                                    };
                                                                                                                                    
                                                                                                                                    export const getQuizzes = async (uid: string, max = 20): Promise<Quiz[]> => {
                                                                                                                                      const q = query(quizCol(uid), orderBy("createdAt", "desc"), limit(max));
                                                                                                                                        const snap = await getDocs(q);
                                                                                                                                          return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Quiz));
                                                                                                                                          };
                                                                                                                                          
                                                                                                                                          export const updateQuizScore = async (uid: string, qid: string, score: number): Promise<void> => {
                                                                                                                                            await updateDoc(quizDoc(uid, qid), { score });
                                                                                                                                            };
                                                                                                                                            
                                                                                                                                            export const deleteQuiz = async (uid: string, q
