// services/analytics.ts
// Phase 17 — Analytics : tracking usage, appels IA, conversions
import {
  getFirestore, collection, addDoc, Timestamp,
  doc, setDoc, updateDoc, increment, getDoc,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// ── Types ────────────────────────────────────────────────────────

export type AIScreen =
  | "summary" | "explain" | "solve"
  | "flashcards" | "quiz" | "plan" | "chat";

export type ConversionType =
  | "signup"           // inscription
  | "first_ai_call"    // premier appel IA
  | "first_save"       // première sauvegarde
  | "upgrade_view"     // vue écran upgrade premium
  | "limit_reached";   // limite journalière atteinte

interface AICallEvent {
  userId: string;
  screen: AIScreen;
  language: string;
  fromCache: boolean;   // vrai si résultat servi depuis cache
  success: boolean;
  durationMs: number;
  date: string;         // YYYY-MM-DD
  createdAt: Timestamp;
}

interface ConversionEvent {
  userId: string;
  type: ConversionType;
  screen?: string;  // ← optionnel, jamais undefined dans Firestore
  plan: string;
  date: string;
  createdAt: Timestamp;
}

// ── Helpers ──────────────────────────────────────────────────────

const getToday = () => new Date().toISOString().split("T")[0];

const getContext = () => {
  const app = getApp();
  const db = getFirestore(app);
  const auth = getAuth(app);
  const user = auth.currentUser;
  return { db, user };
};

// ── Track appel IA ───────────────────────────────────────────────
/**
 * À appeler APRÈS chaque appel IA (succès ou échec).
 * @param screen  Écran source
 * @param success Appel réussi ou non
 * @param durationMs Durée en ms
 * @param fromCache Résultat depuis cache (pas de vrai appel IA)
 */
export const trackAICall = async (
  screen: AIScreen,
  success: boolean,
  durationMs: number,
  fromCache = false
): Promise<void> => {
  try {
    const { db, user } = getContext();
    if (!user) return;

    const { currentLanguage } = await import("../store/languageStore")
      .then((m) => ({ currentLanguage: m.useLanguageStore.getState().currentLanguage }));

    const event: AICallEvent = {
      userId: user.uid,
      screen,
      language: currentLanguage,
      fromCache,
      success,
      durationMs,
      date: getToday(),
      createdAt: Timestamp.now(),
    };

    // 1. Log détaillé dans ai_calls
    await addDoc(collection(db, "analytics_ai_calls"), event);

    // 2. Compteurs agrégés par jour
    const dayRef = doc(db, "analytics_daily", `${user.uid}_${getToday()}`);
    const daySnap = await getDoc(dayRef);

    if (daySnap.exists()) {
      await updateDoc(dayRef, {
        [`screens.${screen}`]: increment(1),
        totalCalls: increment(1),
        cachedCalls: fromCache ? increment(1) : increment(0),
        failedCalls: !success ? increment(1) : increment(0),
      });
    } else {
      await setDoc(dayRef, {
        userId: user.uid,
        date: getToday(),
        totalCalls: 1,
        cachedCalls: fromCache ? 1 : 0,
        failedCalls: !success ? 1 : 0,
        screens: { [screen]: 1 },
        createdAt: Timestamp.now(),
      });
    }
  } catch (e) {
    // Analytics silencieux — ne jamais bloquer l'UX
    console.log("Analytics trackAICall error:", e);
  }
};

// ── Track conversion ─────────────────────────────────────────────
/**
 * À appeler lors d'événements clés de conversion.
 */
export const trackConversion = async (
  type: ConversionType,
  screen?: string
): Promise<void> => {
  try {
    const { db, user } = getContext();
    if (!user) return;

    const usagePlan = await import("../store/usageStore")
      .then((m) => m.useUsageStore.getState().usage?.plan || "free");

    const event: ConversionEvent = {
      userId: user.uid,
      type,
      plan: usagePlan,
      date: getToday(),
      createdAt: Timestamp.now(),
      // ← CORRECTION : n'ajouter screen que s'il est défini
      ...(screen !== undefined && { screen }),
    };

    await addDoc(collection(db, "analytics_conversions"), event);
  } catch (e) {
    console.log("Analytics trackConversion error:", e);
  }
};

// ── Track vue écran ──────────────────────────────────────────────
/**
 * À appeler au montage de chaque écran IA.
 */
export const trackScreenView = async (screen: AIScreen): Promise<void> => {
  try {
    const { db, user } = getContext();
    if (!user) return;

    await addDoc(collection(db, "analytics_screens"), {
      userId: user.uid,
      screen,
      date: getToday(),
      createdAt: Timestamp.now(),
    });
  } catch (e) {
    console.log("Analytics trackScreenView error:", e);
  }
};