// app/solve.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  getFirestore, collection, getDocs, query, where,
  orderBy, limit, startAfter, QueryDocumentSnapshot,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { SolveResult } from "../types/ai";
import { useAiStore } from "../store/aiStore";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../store/languageStore";
import { useAIRequest } from "../hooks/useAIRequest";
import { UsageBanner } from "../components/UsageBanner";
import { readAICache, writeAICache } from "../store/aiCacheStore";
import { limitInput, getTruncationMessage } from "../utils/inputLimiter";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDeleteHistory } from "../hooks/useDeleteHistory";
import { ImportTextButton } from "../components/ImportTextButton";
import { useHistoryStore } from "../store/historyStore";
import { useStreakStore } from "../store/streakStore";
import { useThemeStore } from "../store/themeStore";
import { Colors } from "../constants/colors";
import { useLocalSearchParams } from "expo-router";

const CACHE_KEY = "studyai_solutions";
const MAX_CACHE_ITEMS = 10;
const PAGE_SIZE = 5;

interface CachedSolution {
  id: string; userId: string; exercise: string;
  solution: string; steps: string[]; subject: string; createdAt: string;
}

export default function SolveScreen() {
  const app = getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, "us-central1");
  const { saveSolution, isLoading } = useAiStore();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const { isDark } = useThemeStore();
  const C = isDark ? Colors.dark : Colors.light;
  const isRTL = currentLanguage === "ar";
  const { confirmDeleteOne, confirmDeleteAll } = useDeleteHistory();
  const refreshTrigger = useHistoryStore((state) => state.refreshTrigger["solutions"] || 0);
  const { startTracking, endTracking, trackConv, trackView } = useAnalytics("solve");
  const { checkAndConsume, checkAndConsumeFile } = useAIRequest();
  const { addPoints } = useStreakStore();

  const [exercise, setExercise] = useState("");
  const [subject, setSubject] = useState("");
  const [result, setResult] = useState<SolveResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cachedSolutions, setCachedSolutions] = useState<CachedSolution[]>([]);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const { loadId } = useLocalSearchParams<{ loadId?: string }>();

  useEffect(() => {
    trackView();
    const loadCache = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const raw = await AsyncStorage.getItem(`${CACHE_KEY}_${user.uid}`);
        if (raw) {
          const { data } = JSON.parse(raw);
          if (data?.length > 0) { setCachedSolutions(data); setHasMore(data.length >= PAGE_SIZE); }
        }
        const q = query(collection(db, "solutions"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
        const snap = await getDocs(q);
        if (snap.empty) return;
        const fromFirestore: CachedSolution[] = snap.docs.map((doc) => ({
          id: doc.id, userId: doc.data().userId,
          exercise: doc.data().exercise || "",
          solution: doc.data().solution || "",
          steps: doc.data().steps || [],
          subject: doc.data().subject || "",
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        }));
        setCachedSolutions(fromFirestore);
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === PAGE_SIZE);
        await AsyncStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({ data: fromFirestore, timestamp: Date.now() }));
      } catch (e) { console.log("Solve cache load error:", e); }
    };
    loadCache();
  }, [refreshTrigger]);

  useEffect(() => {
  if (loadId && cachedSolutions.length > 0) {
    const item = cachedSolutions.find((s) => s.id === loadId);
    if (item) handleLoadFromHistory(item);
  }
}, [loadId, cachedSolutions]);

  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;
    const user = auth.currentUser;
    if (!user) return;
    setLoadingMore(true);
    try {
      const q = query(collection(db, "solutions"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      if (snap.empty) { setHasMore(false); return; }
      const more: CachedSolution[] = snap.docs.map((doc) => ({
        id: doc.id, userId: doc.data().userId,
        exercise: doc.data().exercise || "",
        solution: doc.data().solution || "",
        steps: doc.data().steps || [],
        subject: doc.data().subject || "",
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }));
      const updated = [...cachedSolutions, ...more];
      setCachedSolutions(updated);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setDisplayCount((prev) => prev + PAGE_SIZE);
      await AsyncStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({ data: updated.slice(0, MAX_CACHE_ITEMS), timestamp: Date.now() }));
    } catch (e) { console.log("Load more solutions error:", e); }
    finally { setLoadingMore(false); }
  };

  const getMoreLabel = () =>
    currentLanguage === "ar" ? "عرض المزيد" : currentLanguage === "en" ? "Show more" : "Voir plus";

  const handleLoadFromHistory = (item: CachedSolution) => {
    setExercise(item.exercise);
    setResult({ userId: item.userId, exercise: item.exercise, solution: item.solution, steps: item.steps, subject: item.subject, createdAt: item.createdAt });
    setSaved(true);
  };

  const SUBJECTS =
    currentLanguage === "ar" ? ["رياضيات", "فيزياء", "كيمياء", "معلوماتية", "أخرى"]
    : currentLanguage === "en" ? ["Maths", "Physics", "Chemistry", "CS", "Other"]
    : ["Maths", "Physique", "Chimie", "Info", "Autre"];

  const handleSolve = async () => {
    if (exercise.trim().length < 5) { Alert.alert(t("error"), "Saisis l'exercice à résoudre."); return; }
    const allowed = await checkAndConsume();
    if (!allowed) return;
    const { text: limitedExercise, wasTruncated } = limitInput(exercise, "solve");
    if (wasTruncated) Alert.alert("ℹ️", getTruncationMessage(currentLanguage, 1500));
    const cacheInput = { exercise: limitedExercise, subject, language: currentLanguage };
    const cached = await readAICache("solve", cacheInput);
    if (cached) {
      endTracking(true, true);
      setResult({ userId: auth.currentUser?.uid || "anonymous", exercise, solution: cached.solution || "", steps: cached.steps || [], subject: cached.subject || subject || "Général", createdAt: new Date().toISOString() });
      return;
    }
    startTracking(); setGenerating(true); setResult(null); setSaved(false);
    try {
      const fn = httpsCallable(functions, "solveExercise");
      const res = await fn({ exercise: limitedExercise, subject, language: currentLanguage });
      const data = res.data as any;
      setResult({ userId: auth.currentUser?.uid || "anonymous", exercise, solution: data.solution || "", steps: data.steps || [], subject: data.subject || subject || "Général", createdAt: new Date().toISOString() });
      await writeAICache("solve", cacheInput, data);
      await addPoints("SOLUTION");
      endTracking(true);
    } catch (e: any) { endTracking(false); Alert.alert(t("error"), e.message || "La résolution a échoué."); }
    finally { setGenerating(false); }
  };

  const handleSave = async () => {
    if (!result) return;
    const user = auth.currentUser;
    if (!user) { Alert.alert(t("error"), currentLanguage === "ar" ? "يجب تسجيل الدخول للحفظ" : currentLanguage === "en" ? "You must be logged in to save" : "Tu dois être connecté pour sauvegarder."); return; }
    try {
      await saveSolution(result);
      setSaved(true); trackConv("first_save");
      const newEntry: CachedSolution = { id: Date.now().toString(), userId: user.uid, exercise: result.exercise, solution: result.solution, steps: result.steps, subject: result.subject, createdAt: result.createdAt };
      const updated = [newEntry, ...cachedSolutions].slice(0, MAX_CACHE_ITEMS);
      setCachedSolutions(updated); setHasMore(updated.length >= PAGE_SIZE);
      await AsyncStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({ data: updated, timestamp: Date.now() }));
      Alert.alert("✅", t("saved"));
    } catch (e: any) {
      Alert.alert(t("error"), currentLanguage === "ar" ? `فشل الحفظ.\n\n${e?.message || "خطأ غير معروف"}` : currentLanguage === "en" ? `Save failed.\n\n${e?.message || "Unknown error"}` : `La sauvegarde a échoué.\n\n${e?.message || "Erreur inconnue"}`);
    }
  };

  const getShareContent = () => {
    if (!result) return "";
    const stepsText = result.steps.length > 0 ? result.steps.map((s, i) => `${i + 1}. ${s}`).join("\n") : "";
    return `✏️ ${currentLanguage === "ar" ? "الحل" : currentLanguage === "en" ? "Solution" : "Solution"} — StudyAI\n\n📚 ${result.subject}\n\n${stepsText ? (currentLanguage === "ar" ? "الخطوات:\n" : currentLanguage === "en" ? "Steps:\n" : "Étapes:\n") + stepsText + "\n\n" : ""}✅ ${result.solution}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}>
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={C.text} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "700", color: C.text, textAlign: isRTL ? "right" : "left" }}>
              {t("solve_title_screen")}
            </Text>
            <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>{t("generated_by")}</Text>
          </View>
        </View>

        <UsageBanner isRTL={isRTL} />

        {/* Matière */}
        <Text style={{ fontSize: 15, fontWeight: "600", color: C.text, marginBottom: 10, textAlign: isRTL ? "right" : "left" }}>
          📚 {currentLanguage === "ar" ? "المادة" : currentLanguage === "en" ? "Subject" : "Matière"}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8 }}>
            {SUBJECTS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSubject(s === subject ? "" : s)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: subject === s ? C.primary : C.card,
                  borderWidth: 1, borderColor: subject === s ? C.primary : C.borderMedium,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "500", color: subject === s ? "#FFF" : C.text }}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Exercice */}
        <Text style={{ fontSize: 15, fontWeight: "600", color: C.text, marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
          ✏️ {t("exercise_input")}
        </Text>

        <ImportTextButton
          onTextExtracted={(text) => { setExercise(text); setResult(null); setSaved(false); }}
          onBeforeImport={async () => { const allowed = await checkAndConsumeFile(); return allowed; }}
          currentLanguage={currentLanguage} isRTL={isRTL}
        />

        <TextInput
          value={exercise} onChangeText={setExercise}
          placeholder={t("exercise_input") + "..."}
          placeholderTextColor={C.textTertiary}
          multiline numberOfLines={6}
          textAlign={isRTL ? "right" : "left"}
          style={{
            backgroundColor: C.card, borderWidth: 1, borderColor: C.borderMedium,
            borderRadius: 12, padding: 14, fontSize: 14, color: C.text,
            minHeight: 140, textAlignVertical: "top", marginBottom: 24,
            writingDirection: isRTL ? "rtl" : "ltr",
          }}
        />

        {/* Bouton Résoudre */}
        <TouchableOpacity
          onPress={handleSolve} disabled={generating}
          style={{
            backgroundColor: generating ? (isDark ? "#3730A3" : "#A5B4FC") : C.primary,
            borderRadius: 14, padding: 16, alignItems: "center", elevation: 4, marginBottom: 24,
          }}
        >
          {generating ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 10 }}>{t("solving")}</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="calculator-outline" size={20} color="#FFF" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>{t("solve_btn")}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Résultat */}
        {result && (
          <View>
            {/* Badge matière */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", marginBottom: 14 }}>
              <View style={{ backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: C.primary }}>
                  📚 {result.subject}
                </Text>
              </View>
            </View>

            {/* Étapes */}
            {result.steps.length > 0 && (
              <View style={{
                backgroundColor: C.card, borderRadius: 14, padding: 16,
                marginBottom: 14, borderWidth: 1, borderColor: C.border,
              }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 12, textAlign: isRTL ? "right" : "left" }}>
                  🪜 {t("steps")}
                </Text>
                {result.steps.map((step, i) => (
                  <View key={i} style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "flex-start", marginBottom: 10, paddingBottom: 10,
                    borderBottomWidth: i < result.steps.length - 1 ? 1 : 0,
                    borderBottomColor: C.border,
                  }}>
                    <View style={{
                      width: 24, height: 24, borderRadius: 12, backgroundColor: C.primary,
                      alignItems: "center", justifyContent: "center",
                      marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0, flexShrink: 0,
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFF" }}>{i + 1}</Text>
                    </View>
                    <Text style={{
                      fontSize: 13, color: C.text, flex: 1, lineHeight: 20,
                      textAlign: isRTL ? "right" : "left", writingDirection: isRTL ? "rtl" : "ltr",
                    }}>
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Solution finale */}
            <View style={{
              backgroundColor: isDark ? "#022C22" : "#F0FDF4",
              borderRadius: 14, padding: 16, marginBottom: 16,
              borderLeftWidth: isRTL ? 0 : 4, borderRightWidth: isRTL ? 4 : 0,
              borderLeftColor: "#10B981", borderRightColor: "#10B981",
            }}>
              <Text style={{
                fontSize: 14, fontWeight: "700",
                color: isDark ? "#34D399" : "#065F46",
                marginBottom: 8, textAlign: isRTL ? "right" : "left",
              }}>
                ✅ {t("final_solution")}
              </Text>
              <Text style={{
                fontSize: 14, color: isDark ? "#34D399" : "#065F46",
                lineHeight: 22, textAlign: isRTL ? "right" : "left",
                writingDirection: isRTL ? "rtl" : "ltr",
              }}>
                {result.solution}
              </Text>
            </View>

            {/* Actions principales */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12, marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => { setResult(null); setSaved(false); setExercise(""); }}
                style={{
                  flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
                  backgroundColor: isDark ? C.card : "#F3F4F6",
                  borderWidth: 1, borderColor: C.border,
                }}
              >
                <Text style={{ fontWeight: "600", color: C.text, fontSize: 15 }}>🔄 {t("new")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave} disabled={saved || isLoading}
                style={{ flex: 1, borderRadius: 12, padding: 14, alignItems: "center", backgroundColor: saved ? "#10B981" : C.primary }}
              >
                {isLoading ? <ActivityIndicator color="#FFF" size="small" /> : (
                  <Text style={{ fontWeight: "600", color: "#FFF", fontSize: 15 }}>
                    {saved ? `✅ ${t("saved")}` : `💾 ${t("save")}`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Actions secondaires */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12 }}>
              <TouchableOpacity
                onPress={async () => { await Clipboard.setStringAsync(getShareContent()); Alert.alert("✅", currentLanguage === "ar" ? "تم النسخ!" : currentLanguage === "en" ? "Copied!" : "Copié !"); }}
                style={{
                  flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
                  flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "center", gap: 6,
                  backgroundColor: isDark ? C.card : "#F3F4F6", borderWidth: 1, borderColor: C.border,
                }}
              >
                <Ionicons name="copy-outline" size={16} color={C.text} />
                <Text style={{ fontWeight: "600", color: C.text, fontSize: 15 }}>
                  {currentLanguage === "ar" ? "نسخ" : currentLanguage === "en" ? "Copy" : "Copier"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => { await Share.share({ message: getShareContent() }); }}
                style={{
                  flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
                  flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "center", gap: 6,
                  backgroundColor: C.primaryLight, borderWidth: 1, borderColor: isDark ? "#3730A3" : "#C7D2FE",
                }}
              >
                <Ionicons name="share-social-outline" size={16} color={C.primary} />
                <Text style={{ fontWeight: "600", color: C.primary, fontSize: 15 }}>
                  {currentLanguage === "ar" ? "مشاركة" : currentLanguage === "en" ? "Share" : "Partager"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Historique */}
        {cachedSolutions.length > 0 && !result && (
          <View style={{ marginTop: 24 }}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: C.text, textAlign: isRTL ? "right" : "left" }}>
                🕒 {currentLanguage === "ar" ? "الحلول المحفوظة" : currentLanguage === "en" ? "Saved Solutions" : "Solutions sauvegardées"}
              </Text>
              <TouchableOpacity onPress={() => confirmDeleteAll("solutions", "Solutions sauvegardées", currentLanguage, () => setCachedSolutions([]))}>
                <Text style={{ fontSize: 12, color: C.danger, fontWeight: "600" }}>
                  {currentLanguage === "ar" ? "حذف الكل" : currentLanguage === "en" ? "Clear all" : "Tout effacer"}
                </Text>
              </TouchableOpacity>
            </View>

            {cachedSolutions.slice(0, displayCount).map((item) => (
              <TouchableOpacity
                key={item.id} onPress={() => handleLoadFromHistory(item)}
                style={{
                  backgroundColor: C.card, borderRadius: 12, padding: 14,
                  marginBottom: 10, borderWidth: 1, borderColor: C.border, elevation: 1,
                }}
              >
                <Text style={{ fontSize: 13, color: C.text, lineHeight: 18, textAlign: isRTL ? "right" : "left" } as any} numberOfLines={2}>
                  ✏️ {item.exercise}
                </Text>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", marginTop: 6 }}>
                  <Text style={{ fontSize: 11, color: C.textTertiary }}>
                    {new Date(item.createdAt).toLocaleDateString(currentLanguage === "ar" ? "ar-SA" : currentLanguage === "en" ? "en-GB" : "fr-FR")}
                  </Text>
                  {item.subject ? (
                    <View style={{ backgroundColor: C.primaryLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 10, color: C.primary, fontWeight: "600" }}>{item.subject}</Text>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    onPress={() => confirmDeleteOne(
                      "solutions", item.id, item.exercise?.slice(0, 30) || "solution", currentLanguage,
                      () => setCachedSolutions((prev: any[]) => prev.filter((x) => x.id !== item.id)),
                      async () => {
                        const user = auth.currentUser;
                        if (!user) return;
                        const updated = cachedSolutions.filter((x: any) => x.id !== item.id);
                        await AsyncStorage.setItem(`studyai_solutions_${user.uid}`, JSON.stringify({ data: updated, timestamp: Date.now() }));
                      }
                    )}
                  >
                    <Ionicons name="trash-outline" size={14} color={C.danger} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}

            {hasMore && (
              <TouchableOpacity
                onPress={handleLoadMore} disabled={loadingMore}
                style={{
                  borderRadius: 12, padding: 14, alignItems: "center",
                  backgroundColor: isDark ? C.card : "#F3F4F6",
                  borderWidth: 1, borderColor: C.border, marginTop: 4,
                }}
              >
                {loadingMore ? <ActivityIndicator size="small" color={C.primary} /> : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="chevron-down" size={16} color={C.primary} />
                    <Text style={{ fontWeight: "600", color: C.primary, fontSize: 14 }}>{getMoreLabel()}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}