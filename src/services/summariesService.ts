import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export interface Summary {
  id?: string;
    originalText: string;
      summary: string;
        createdAt?: unknown;
          updatedAt?: unknown;
          }

          const summariesCol = (userId: string) => collection(db, "users", userId, "summaries");
          const summaryDoc = (userId: string, summaryId: string) => doc(db, "users", userId, "summaries", summaryId);

          export const createSummary = async (userId: string, originalText: string, summary: string): Promise<string> => {
            const ref = await addDoc(summariesCol(userId), {
                originalText,
                    summary,
                        createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                              });
                                return ref.id;
                                };

                                export const getSummary = async (userId: string, summaryId: string): Promise<Summary | null> => {
                                  const snap = await getDoc(summaryDoc(userId, summaryId));
                                    if (!snap.exists()) return null;
                                      return { id: snap.id, ...snap.data() } as Summary;
                                      };

                                      export const getSummaries = async (userId: string): Promise<Summary[]> => {
                                        const q = query(summariesCol(userId), orderBy("createdAt", "desc"));
                                          const snap = await getDocs(q);
                                            return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Summary));
                                            };

                                            export const updateSummary = async (userId: string, summaryId: string, summary: string): Promise<void> => {
                                              await updateDoc(summaryDoc(userId, summaryId), { summary, updatedAt: serverTimestamp() });
                                              };

                                              export const deleteSummary = async (userId: string, summaryId: string): Promise<void> => {
                                                await deleteDoc(summaryDoc(userId, summaryId));
                                                };
