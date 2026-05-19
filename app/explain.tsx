// app/explain.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Share, Clipboard,
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
import { ExplainResult } from "../types/ai";
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

const CACHE_KEY = "studyai_explanations";
const MAX_CACHE_ITEMS = 10;
const PAGE_SIZE = 5;

interface CachedExplanation {
  id: string; userId: string; inputText: string;
  explanation: string; keyPoints: string[];
  difficulty: string; createdAt: string;
}

export default function ExplainScreen() {
  const app = getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, "us-central1");
  const { saveExplanation, isLoading } = useAiStore();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const { isDark } = useThemeStore();
  const C = isDark ? Colors.dark : Colors.light;
  const isRTL = currentLanguage === "ar";
  const { confirmDeleteOne, confirmDeleteAll } = useDeleteHistory();
  const refreshTrigger = useHistoryStore((state) => state.refreshTrigger["explanations"] || 0);
  const { startTracking, endTracking, trackConv, trackView } = useAnalytics("explain");
  const { checkAndConsume, checkAndConsumeFile } = useAIRequest();
  const { addPoints } = useStreakStore();

  const [text, setText] = useState("");
  const [difficulty, setDifficulty] = useState<"facile" | "moyen" | "difficile">("moyen");
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cachedExplanations, setCachedExplanations] = useState<CachedExplanation[]>([]);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const difficultyColors: Record<string, string> = {
    facile: "#10B981", moyen: "#F59E0B", difficile: "#EF4444",
  };

  const difficultyLabels = {
    facile: currentLanguage === "ar" ? "سهل" : currentLanguage === "en" ? "Easy" : "Facile",
    moyen: currentLanguage === "ar" ? "متوسط" : currentLanguage === "en" ? "Medium" : "Moyen",
    difficile: currentLanguage === "ar" ? "صعب" : currentLanguage === "en" ? "Hard" : "Difficile",
  };

  useEffect(() => {
    trackView();
    const loadCache = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const raw = await AsyncStorage.getItem(`${CACHE_KEY}_${user.uid}`);
        if (raw) {
          const { data } = JSON.parse(raw);
          if (data?.length > 0) { setCachedExplanations(data); setHasMore(data.length >= PAGE_SIZE); }
        }
        const q = query(collection(db, "explanations"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
        const snap = await getDocs(q);
        if (snap.empty) return;
        const fromFirestore: CachedExplanation[] = snap.docs.map((doc) => ({
          id: doc.id, userId: doc.data().userId,
          inputText: doc.data().inputText || doc.data().text || "",
          explanation: doc.data().explanation || "",
          keyPoints: doc.data().keyPoints || [],
          difficulty: doc.data().difficulty || "moyen",
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        }));
        setCachedExplanations(fromFirestore);
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === PAGE_SIZE);
        await AsyncStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({ data: fromFirestore, timestamp: Date.now() }));
      } catch (e) { console.log("Explain cache load error:", e); }
    };
    loadCache();
  }, [refreshTrigger]);

  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;
    const user = auth.currentUser;
    if (!user) return;
    setLoadingMore(true);
    try {
      const q = query(collection(db, "explanations"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      if (snap.empty) { setHasMore(false); return; }
      const more: CachedExplanation[] = snap.docs.map((doc) => ({
        id: doc.id, userId: doc.data().userId,
        inputText: doc.data().inputText || doc.data().text || "",
        explanation: doc.data().explanation || "",
        keyPoints: doc.data().keyPoints || [],
        difficulty: doc.data().difficulty || "moyen",
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }));
      const updated = [...cachedExplanations, ...more];
      setCachedExplanations(updated);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setDisplayCount((prev) => prev + PAGE_SIZE);
      await AsyncStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({ data: updated.slice(0, MAX_CACHE_ITEMS), timestamp: Date.now() }));
    } catch (e) { console.log("Load more explanations error:", e); }
    finally { setLoadingMore(false); }
  };

  const getMoreLabel = () =>
    currentLanguage === "ar" ? "عرض المزيد" : currentLanguage === "en" ? "Show more" : "Voir plus";

  const handleLoadFromHistory = (item: CachedExplanation) => {
    setText(item.inputText);
    setResult({ userId: item.userId, inputText: item.inputText, explanation: item.explanation, keyPoints: item.keyPoints, difficulty: item.difficulty as any, createdAt: item.createdAt });
    setSaved(true);
  };

  const getShareContent = () => {
    if (!result) return "";
    const keyPointsText = result.keyPoints.length > 0
      ? `\n\n🔑 ${currentLanguage === "ar" ? "النقاط الرئيسية" : currentLanguage === "en" ? "Key Points" : "Points clés"}:\n${result.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
      : "";
    return `💡 ${currentLanguage === "ar" ? "شرح" : currentLanguage === "en" ? "Explanation" : "Explication"} — StudyAI\n\n${result.explanation}${keyPointsText}`;
  };

  const handleExplain = async () => {
    if (text.trim().length < 10) { Alert.alert(t("error"), "Saisis au moins 10 caractères."); return; }
    const allowed = await checkAndConsume();
    if (!allowed) return;
    const { text: limitedText, wasTruncated } = limitInput(text, "explain");
    if (wasTruncated) Alert.alert("ℹ️", getTruncationMessage(currentLanguage, 2000));
    const cacheInput = { text: limitedText, difficulty, language: currentLanguage };
    const cached = await readAICache("explain", cacheInput);
    if (cached) {
      endTracking(true, true);
      setResult({ userId: auth.currentUser?.uid || "anonymous", inputText: text, explanation: cached.explanation || "", keyPoints: cached.keyPoints || [], difficulty: cached.difficulty || difficulty, createdAt: new Date().toISOString() });
      return;
    }
    startTracking(); setGenerating(true); setResult(null); setSaved(false);
    try {
      const fn = httpsCallable(functions, "explainText");
      const res = await fn({ text: limitedText, difficulty, language: currentLanguage });
      const data = res.data as any;
      setResult({ userId: auth.currentUser?.uid || "anonymous", inputText: text, explanation: data.explanation || "", keyPoints: data.keyPoints || [], difficulty: data.difficulty || difficulty, createdAt: new Date().toISOString() });
      await writeAICache("explain", cacheInput, data);
      await addPoints("EXPLANATION");
      endTracking(true);
    } catch (e: any) { endTracking(false); Alert.alert(t("error"), e.message || "La génération a échoué."); }
    finally { setGenerating(false); }
  };

  const handleSave = async () => {
    if (!result) return;
    const user = auth.currentUser;
    if (!user) { Alert.alert(t("error"), currentLanguage === "ar" ? "يجب تسجيل الدخول للحفظ" : currentLanguage === "en" ? "You must be logged in to save" : "Tu dois être connecté pour sauvegarder."); return; }
    try {
      await saveExplanation(result);
      setSaved(true); trackConv("first_save");
      const newEntry: CachedExplanation = { id: Date.now().toString(), userId: user.uid, inputText: result.inputText, explanation: result.explanation, keyPoints: result.keyPoints, difficulty: result.difficulty, createdAt: result.createdAt };
      const updated = [newEntry, ...cachedExplanations].slice(0, MAX_CACHE_ITEMS);
      setCachedExplanations(updated); setHasMore(updated.length >= PAGE_SIZE);
      await AsyncStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({ data: updated, timestamp: Date.now() }));
      Alert.alert("✅", t("saved"));
    } catch (e: any) {
      Alert.alert(t("error"), currentLanguage === "ar" ? `فشل الحفظ.\n\n${e?.message || "خطأ غير معروف"}` : currentLanguage === "en" ? `Save failed.\n\n${e?.message || "Unknown error"}` : `La sauvegarde a échoué.\n\n${e?.message || "Erreur inconnue"}`);
    }
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
              {t("explain_title_screen")}
            </Text>
            <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>{t("generated_by")}</Text>
          </View>
        </View>

        <UsageBanner isRTL={isRTL} />

        {/* Input */}
        <Text style={{ fontSize: 15, fontWeight: "600", color: C.text, marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
          📝 {t("text_to_explain")}
        </Text>

        <ImportTextButton
          onTextExtracted={(text) => { setText(text); setResult(null); setSaved(false); }}
          onBeforeImport={async () => { const allowed = await checkAndConsumeFile(); return allowed; }}
          currentLanguage={currentLanguage} isRTL={isRTL}
        />

        <TextInput
          value={text} onChangeText={setText}
          placeholder={t("text_to_explain") + "..."}
          placeholderTextColor={C.textTertiary}
          multiline numberOfLines={6}
          textAlign={isRTL ? "right" : "left"}
          style={{
            backgroundColor: C.card, borderWidth: 1, borderColor: C.borderMedium,
            borderRadius: 12, padding: 14, fontSize: 14, color: C.text,
            minHeight: 140, textAlignVertical: "top", marginBottom: 20,
            writingDirection: isRTL ? "rtl" : "ltr",
          }}
        />

        {/* Niveau */}
        <Text style={{ fontSize: 15, fontWeight: "600", color: C.text, marginBottom: 10, textAlign: isRTL ? "right" : "left" }}>
          🎯 {t("level")}
        </Text>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10, marginBottom: 24 }}>
          {(["facile", "moyen", "difficile"] as const).map((d) => (
            <TouchableOpacity
              key={d} onPress={() => setDifficulty(d)}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
                backgroundColor: difficulty === d ? difficultyColors[d] : C.card,
                borderWidth: 1, borderColor: difficulty === d ? difficultyColors[d] : C.borderMedium,
              }}
            >
              <Text style={{ fontWeight: "600", fontSize: 13, color: difficulty === d ? "#FFFFFF" : C.text }}>
                {difficultyLabels[d]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bouton Expliquer */}
        <TouchableOpacity
          onPress={handleExplain} disabled={generating}
          style={{
            backgroundColor: generating ? (isDark ? "#3730A3" : "#A5B4FC") : C.primary,
            borderRadius: 14, padding: 16, alignItems: "center", elevation: 4, marginBottom: 24,
          }}
        >
          {generating ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 10 }}>{t("explaining")}</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="bulb-outline" size={20} color="#FFF" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>{t("explain_btn")}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Résultat */}
        {result && (
          <View>
            {/* Explication */}
            <View style={{
              backgroundColor: C.primaryLight, borderRadius: 14, padding: 16, marginBottom: 14,
              borderLeftWidth: isRTL ? 0 : 4, borderRightWidth: isRTL ? 4 : 0,
              borderLeftColor: C.primary, borderRightColor: C.primary,
            }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: isDark ? C.primaryDark : "#3730A3", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
                💡 {t("explanation")}
              </Text>
              <Text style={{ fontSize: 14, color: isDark ? C.primaryDark : "#3730A3", lineHeight: 22, textAlign: isRTL ? "right" : "left", writingDirection: isRTL ? "rtl" : "ltr" }}>
                {result.explanation}
              </Text>
            </View>

            {/* Points clés */}
            {result.keyPoints.length > 0 && (
              <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 10, textAlign: isRTL ? "right" : "left" }}>
                  🔑 {t("key_points")}
                </Text>
                {result.keyPoints.map((point, i) => (
                  <View key={i} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "flex-start", marginBottom: 6 }}>
                    <View style={{
                      width: 20, height: 20, borderRadius: 10, backgroundColor: C.primaryLight,
                      alignItems: "center", justifyContent: "center",
                      marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0, marginTop: 1,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: C.primary }}>{i + 1}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: C.text, flex: 1, lineHeight: 20, textAlign: isRTL ? "right" : "left", writingDirection: isRTL ? "rtl" : "ltr" }}>
                      {point}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Badge niveau */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{ backgroundColor: difficultyColors[result.difficulty] + "20", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: difficultyColors[result.difficulty] }}>
                  {t("level")} : {difficultyLabels[result.difficulty as keyof typeof difficultyLabels]}
                </Text>
              </View>
            </View>

            {/* Actions principales */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12, marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => { setResult(null); setSaved(false); setText(""); }}
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
                {isLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ fontWeight: "600", color: "#FFF", fontSize: 15 }}>
                    {saved ? `✅ ${t("saved")}` : `💾 ${t("save")}`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Actions secondaires */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => { Clipboard.setString(getShareContent()); Alert.alert("✅", currentLanguage === "ar" ? "تم النسخ!" : currentLanguage === "en" ? "Copied!" : "Copié !"); }}
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
        {cachedExplanations.length > 0 && !result && (
          <View style={{ marginTop: 24 }}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: C.text, textAlign: isRTL ? "right" : "left" }}>
                🕒 {currentLanguage === "ar" ? "الشروحات المحفوظة" : currentLanguage === "en" ? "Saved Explanations" : "Explications sauvegardées"}
              </Text>
              <TouchableOpacity onPress={() => confirmDeleteAll("explanations", "Explications sauvegardées", currentLanguage, () => setCachedExplanations([]))}>
                <Text style={{ fontSize: 12, color: C.danger, fontWeight: "600" }}>
                  {currentLanguage === "ar" ? "حذف الكل" : currentLanguage === "en" ? "Clear all" : "Tout effacer"}
                </Text>
              </TouchableOpacity>
            </View>

            {cachedExplanations.slice(0, displayCount).map((item) => (
              <TouchableOpacity
                key={item.id} onPress={() => handleLoadFromHistory(item)}
                style={{
                  backgroundColor: C.card, borderRadius: 12, padding: 14,
                  marginBottom: 10, borderWidth: 1, borderColor: C.border, elevation: 1,
                }}
              >
                <Text style={{ fontSize: 13, color: C.text, lineHeight: 18, textAlign: isRTL ? "right" : "left" } as any} numberOfLines={2}>
                  {item.explanation}
                </Text>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", marginTop: 6 }}>
                  <Text style={{ fontSize: 11, color: C.textTertiary }}>
                    {new Date(item.createdAt).toLocaleDateString(currentLanguage === "ar" ? "ar-SA" : currentLanguage === "en" ? "en-GB" : "fr-FR")}
                  </Text>
                  <View style={{ backgroundColor: difficultyColors[item.difficulty] + "20", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 10, color: difficultyColors[item.difficulty], fontWeight: "600" }}>
                      {difficultyLabels[item.difficulty as keyof typeof difficultyLabels]}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmDeleteOne(
                      "explanations", item.id, item.explanation?.slice(0, 30) || "explication", currentLanguage,
                      () => setCachedExplanations((prev: any[]) => prev.filter((x) => x.id !== item.id)),
                      async () => {
                        const user = auth.currentUser;
                        if (!user) return;
                        const updated = cachedExplanations.filter((x: any) => x.id !== item.id);
                        await AsyncStorage.setItem(`studyai_explanations_${user.uid}`, JSON.stringify({ data: updated, timestamp: Date.now() }));
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
                {loadingMore ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : (
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