// store/usageStore.ts
import { create } from "zustand";
import {
  doc, getDoc, setDoc, updateDoc,
  increment, getFirestore,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { UsageRecord, UserPlan, LIMITS, FILE_LIMITS } from "../types/usage";

const getTodayDate = () => new Date().toISOString().split("T")[0];

interface UsageState {
  usage: UsageRecord | null;
  isLoading: boolean;
  loadUsage: () => Promise<void>;
  canMakeRequest: () => boolean;
  canMakeFileRequest: () => boolean;
  consumeRequest: () => Promise<boolean>;
  consumeFileRequest: () => Promise<boolean>;
  upgradeToPremium: () => Promise<void>;
  resetUsageForTest: () => Promise<void>;
}

export const useUsageStore = create<UsageState>((set, get) => ({
  usage: null,
  isLoading: false,

  loadUsage: async () => {
    const app = getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;

    set({ isLoading: true });
    try {
      const today = getTodayDate();
      const ref = doc(db, "usage", `${user.uid}_${today}`);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data() as UsageRecord;
        // Assurer que fileCount existe
        if (data.fileCount === undefined) data.fileCount = 0;
        set({ usage: data });
      } else {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const plan: UserPlan = userSnap.exists()
          ? (userSnap.data().plan as UserPlan) || "free"
          : "free";

        const newRecord: UsageRecord = {
          userId: user.uid,
          date: today,
          count: 0,
          fileCount: 0,
          plan,
          updatedAt: new Date().toISOString(),
        };
        await setDoc(ref, newRecord);
        set({ usage: newRecord });
      }
    } catch (e) {
      console.error("loadUsage error:", e);
    } finally {
      set({ isLoading: false });
    }
  },

  canMakeRequest: () => {
    const { usage } = get();
    if (!usage) return false;
    return usage.count < LIMITS[usage.plan];
  },

  canMakeFileRequest: () => {
    const { usage } = get();
    if (!usage) return false;
    return usage.fileCount < FILE_LIMITS[usage.plan];
  },

  consumeRequest: async () => {
    const app = getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return false;

    await get().loadUsage();
    const { usage } = get();
    if (!usage) return false;

    if (usage.count >= LIMITS[usage.plan]) return false;

    const today = getTodayDate();
    const ref = doc(db, "usage", `${user.uid}_${today}`);
    await updateDoc(ref, {
      count: increment(1),
      updatedAt: new Date().toISOString(),
    });

    set({
      usage: { ...usage, count: usage.count + 1, updatedAt: new Date().toISOString() },
    });

    return true;
  },

  consumeFileRequest: async () => {
    const app = getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return false;

    await get().loadUsage();
    const { usage } = get();
    if (!usage) return false;

    if (usage.fileCount >= FILE_LIMITS[usage.plan]) return false;

    const today = getTodayDate();
    const ref = doc(db, "usage", `${user.uid}_${today}`);
    await updateDoc(ref, {
      fileCount: increment(1),
      updatedAt: new Date().toISOString(),
    });

    set({
      usage: { ...usage, fileCount: usage.fileCount + 1, updatedAt: new Date().toISOString() },
    });

    return true;
  },

  upgradeToPremium: async () => {
    const app = getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;

    const today = getTodayDate();
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { plan: "premium" }, { merge: true });

    const usageRef = doc(db, "usage", `${user.uid}_${today}`);
    await updateDoc(usageRef, { plan: "premium" }).catch(() => {
      setDoc(usageRef, {
        userId: user.uid,
        date: today,
        count: 0,
        fileCount: 0,
        plan: "premium",
        updatedAt: new Date().toISOString(),
      });
    });

    const { usage } = get();
    if (usage) set({ usage: { ...usage, plan: "premium" } });
  },

  resetUsageForTest: async () => {
    const app = getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;

    const today = getTodayDate();
    const ref = doc(db, "usage", `${user.uid}_${today}`);
    await updateDoc(ref, {
      count: 0,
      fileCount: 0,
      updatedAt: new Date().toISOString(),
    });
    const { usage } = get();
    if (usage) set({ usage: { ...usage, count: 0, fileCount: 0 } });
  },
}));