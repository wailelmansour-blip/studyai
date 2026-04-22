import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export type Plan = "free" | "pro" | "enterprise";

export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    plan: Plan;
    dailyUsage: number;
    studyStreak: number;
    totalPoints: number;
    createdAt?: unknown;
    updatedAt?: unknown;
}

const userRef = (uid: string) => doc(db, "users", uid);

export const createUserDocument = async (uid: string, name: string, email: string): Promise<User> => {
    const data: Omit<User, "id"> = {
          name,
          email,
          plan: "free",
          dailyUsage: 0,
          studyStreak: 0,
          totalPoints: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
    };
    await setDoc(userRef(uid), { id: uid, ...data });
    return { id: uid, ...data };
};

export const fetchUserDocument = async (uid: string): Promise<User | null> => {
    const snap = await getDoc(userRef(uid));
    if (!snap.exists()) return null;
    const d = snap.data() as User;
    return {
          id: d.id ?? uid,
          name: d.name,
          email: d.email,
          avatar: d.avatar,
          plan: d.plan ?? "free",
          dailyUsage: d.dailyUsage ?? 0,
          studyStreak: d.studyStreak ?? 0,
          totalPoints: d.totalPoints ?? 0,
                                };
};

export const updateUserDocument = async (uid: string, fields: Partial<Omit<User, "id" | "createdAt">>): Promise<void> => {
    await updateDoc(userRef(uid), { ...fields, updatedAt: serverTimestamp() });
};

export const incrementDailyUsage = async (uid: string): Promise<void> => {
    const snap = await getDoc(userRef(uid));
    if (!snap.exists()) return;
    const current = (snap.data().dailyUsage as number) ?? 0;
    await updateDoc(userRef(uid), { dailyUsage: current + 1, updatedAt: serverTimestamp() });
};

export const resetDailyUsage = async (uid: string): Promise<void> => {
    await updateDoc(userRef(uid), { dailyUsage: 0, updatedAt: serverTimestamp() });
};

export const addPoints = async (uid: string, points: number): Promise<void> => {
    const snap = await getDoc(userRef(uid));
    if (!snap.exists()) return;
    const current = (snap.data().totalPoints as number) ?? 0;
    await updateDoc(userRef(uid), { totalPoints: current + points, updatedAt: serverTimestamp() });
};

export const incrementStreak = async (uid: string): Promise<void> => {
    const snap = await getDoc(userRef(uid));
    if (!snap.exists()) return;
    const current = (snap.data().studyStreak as number) ?? 0;
    await updateDoc(userRef(uid), { studyStreak: current + 1, updatedAt: serverTimestamp() });
};
