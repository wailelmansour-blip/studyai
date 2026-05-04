// hooks/useDeleteHistory.ts
import { useCallback } from "react";
import { Alert } from "react-native";
import {
  getFirestore,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type HistoryType =
  | "quizzes"
  | "flashcards"
  | "plans"
  | "summaries"
  | "explanations"
  | "solutions"
  | "chatSessions";

// Clés AsyncStorage par type (identiques à celles utilisées dans chaque écran)
export const CACHE_KEYS: Record<HistoryType, string> = {
  quizzes:      "studyai_quizzes",
  flashcards:   "studyai_flashcards",
  plans:        "studyai_plans",
  summaries:    "studyai_summaries",
  explanations: "studyai_explanations",
  solutions:    "studyai_solutions",
  chatSessions: "studyai_chatSessions",
};

export function useDeleteHistory() {
  const app = getApp();
  const db = getFirestore(app);
  const auth = getAuth(app);

  // ─── Supprime UN document Firestore + met à jour le cache local ───────────
  const deleteOne = useCallback(
    async (
      type: HistoryType,
      docId: string,
      onSuccess: () => void,
      cacheUpdater?: () => Promise<void>
    ): Promise<void> => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        await deleteDoc(doc(db, type, docId));

        // Mettre à jour le cache AsyncStorage si un updater est fourni
        if (cacheUpdater) {
          await cacheUpdater();
        }

        onSuccess();
      } catch (e) {
        console.error("useDeleteHistory.deleteOne error:", e);
        Alert.alert("Erreur", "Impossible de supprimer cet élément.");
      }
    },
    [db, auth]
  );

  // ─── Supprime TOUS les documents d'un type pour l'utilisateur courant ─────
  const deleteAll = useCallback(
    async (
      type: HistoryType,
      onSuccess: () => void
    ): Promise<void> => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const q = query(
          collection(db, type),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          onSuccess();
          return;
        }

        // Supprimer tous les docs Firestore
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));

        // Vider le cache AsyncStorage correspondant
        const cacheKey = CACHE_KEYS[type];
        await AsyncStorage.removeItem(`${cacheKey}_${user.uid}`);

        onSuccess();
      } catch (e) {
        console.error("useDeleteHistory.deleteAll error:", e);
        Alert.alert("Erreur", "Impossible de supprimer l'historique.");
      }
    },
    [db, auth]
  );

  // ─── Wrapper confirmDeleteOne avec Alert ──────────────────────────────────
  const confirmDeleteOne = useCallback(
    (
      type: HistoryType,
      docId: string,
      label: string,
      lang: string,
      onSuccess: () => void,
      cacheUpdater?: () => Promise<void>
    ) => {
      const title =
        lang === "ar" ? "حذف" : lang === "en" ? "Delete" : "Supprimer";
      const msg =
        lang === "ar"
          ? `حذف "${label}" ؟`
          : lang === "en"
          ? `Delete "${label}"?`
          : `Supprimer "${label}" ?`;
      const cancel =
        lang === "ar" ? "إلغاء" : lang === "en" ? "Cancel" : "Annuler";
      const confirm =
        lang === "ar" ? "حذف" : lang === "en" ? "Delete" : "Supprimer";

      Alert.alert(title, msg, [
        { text: cancel, style: "cancel" },
        {
          text: confirm,
          style: "destructive",
          onPress: () => deleteOne(type, docId, onSuccess, cacheUpdater),
        },
      ]);
    },
    [deleteOne]
  );

  // ─── Wrapper confirmDeleteAll avec Alert ──────────────────────────────────
  const confirmDeleteAll = useCallback(
    (
      type: HistoryType,
      sectionLabel: string,
      lang: string,
      onSuccess: () => void
    ) => {
      const title =
        lang === "ar"
          ? "حذف الكل"
          : lang === "en"
          ? "Delete All"
          : "Tout supprimer";
      const msg =
        lang === "ar"
          ? `حذف كل سجل "${sectionLabel}" ؟`
          : lang === "en"
          ? `Delete all "${sectionLabel}" history?`
          : `Supprimer tout l'historique "${sectionLabel}" ?`;
      const cancel =
        lang === "ar" ? "إلغاء" : lang === "en" ? "Cancel" : "Annuler";
      const confirm =
        lang === "ar"
          ? "حذف الكل"
          : lang === "en"
          ? "Delete All"
          : "Tout supprimer";

      Alert.alert(title, msg, [
        { text: cancel, style: "cancel" },
        {
          text: confirm,
          style: "destructive",
          onPress: () => deleteAll(type, onSuccess),
        },
      ]);
    },
    [deleteAll]
  );

  return {
    deleteOne,
    deleteAll,
    confirmDeleteOne,
    confirmDeleteAll,
  };
}
