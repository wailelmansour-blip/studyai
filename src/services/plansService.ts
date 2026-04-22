import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export interface StudyPlan {
  id?: string;
    plan: string;
      subjects: string[];
        createdAt?: unknown;
          updatedAt?: unknown;
          }

          const plansCol = (userId: string) => collection(db, "users", userId, "plans");
          const planDoc = (userId: string, planId: string) => doc(db, "users", userId, "plans", planId);

          export const createPlan = async (userId: string, plan: string, subjects: string[]): Promise<string> => {
            const ref = await addDoc(plansCol(userId), {
                plan,
                    subjects,
                        createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                              });
                                return ref.id;
                                };

                                export const getPlan = async (userId: string, planId: string): Promise<StudyPlan | null> => {
                                  const snap = await getDoc(planDoc(userId, planId));
                                    if (!snap.exists()) return null;
                                      return { id: snap.id, ...snap.data() } as StudyPlan;
                                      };

                                      export const getPlans = async (userId: string): Promise<StudyPlan[]> => {
                                        const q = query(plansCol(userId), orderBy("createdAt", "desc"));
                                          const snap = await getDocs(q);
                                            return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudyPlan));
                                            };

                                            export const updatePlan = async (userId: string, planId: string, plan: string, subjects: string[]): Promise<void> => {
                                              await updateDoc(planDoc(userId, planId), { plan, subjects, updatedAt: serverTimestamp() });
                                              };

                                              export const deletePlan = async (userId: string, planId: string): Promise<void> => {
                                                await deleteDoc(planDoc(userId, planId));
                                                };
