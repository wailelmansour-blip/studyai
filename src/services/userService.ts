import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface User {
  id: string;
    name: string;
      email: string;
        avatar?: string;
          studyStreak: number;
            totalPoints: number;
            }

            const userRef = (uid: string) => doc(db, "users", uid);

            // Creer le document utilisateur dans Firestore apres inscription
            export const createUserDocument = async (
              uid: string,
                name: string,
                  email: string
                  ): Promise<User> => {
                    const data = {
                        id: uid,
                            name,
                                email,
                                    studyStreak: 0,
                                        totalPoints: 0,
                                            createdAt: serverTimestamp(),
                                                updatedAt: serverTimestamp(),
                                                  };
                                                    await setDoc(userRef(uid), data);
                                                      return { id: uid, name, email, studyStreak: 0, totalPoints: 0 };
                                                      };

                                                      // Recuperer le document utilisateur depuis Firestore
                                                      export const fetchUserDocument = async (uid: string): Promise<User | null> => {
                                                        const snap = await getDoc(userRef(uid));
                                                          if (!snap.exists()) return null;
                                                            const d = snap.data();
                                                              return {
                                                                  id: d.id,
                                                                      name: d.name,
                                                                          email: d.email,
                                                                              avatar: d.avatar,
                                                                                  studyStreak: d.studyStreak ?? 0,
                                                                                      totalPoints: d.totalPoints ?? 0,
                                                                                        };
                                                                                        };

                                                                                        // Mettre a jour des champs specifiques du document utilisateur
                                                                                        export const updateUserDocument = async (
                                                                                          uid: string,
                                                                                            fields: Partial<Omit<User, "id">>
                                                                                            ): Promise<void> => {
                                                                                              await updateDoc(userRef(uid), { ...fields, updatedAt: serverTimestamp() });
                                                                                              };
