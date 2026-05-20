// app/summary.tsx
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
  collection, addDoc, Timestamp, getFirestore,
  getDocs, query, where, orderBy, limit, startAfter,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../store/languageStore";
import { useAIRequest } from "../hooks/useAIRequest";
import { UsageBanner } from "../components/UsageBanner";
import { readAICache, writeAICache } from "../store/aiCacheStore";
import { limitInput, getTruncationMessage } from "../utils/inputLimiter";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDeleteHistory } from "../hooks/useDeleteHistory";
import { useHistoryStore } from "../store/historyStore";
import { ImportTextButton } from "../components/ImportTextButton";
import * as Clipboard from "expo-clipboard";
import { useStreakStore } from "../store/streakStore";
import { useThemeStore } from "../store/themeStore";
import { Colors } from "../constants/colors";
import { useLocalSearchParams } from "expo-router";

const CACHE_KEY = "studyai_summaries";
const MAX_CACHE_ITEMS = 10;
const PAGE_SIZE = 5;

interface CachedSummary {
  id: string; userId: string; originalText: string;
  summary: string; language: string; createdAt: string;
}

export default function SummaryScreen() {
  const app = getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, "us-central1");
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const { isDark } = useThemeStore();
  const C = isDark ? Colors.dark : Colors.light;
  const isRTL = currentLanguage === "ar";
  const { confirmDeleteOne, confirmDeleteAll } = useDeleteHistory();
  const refreshTrigger = useHistoryStore((state) => state.refreshTrigger["summaries"] || 0);
  const { startTracking, endTracking, trackConv, trackView } = useAnalytics("summary");
  const { checkAndConsume, checkAndConsumeFile } = useAIRequest();
  const { addPoints } = useStreakStore();

  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [cachedSummaries, setCachedSummaries] = useState<CachedSummary[]>([]);
  const [isFromCache, setIsFromCache] = useState(false);
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
          if (data?.length > 0) { setCachedSummaries(data); setHasMore(data.length >= PAGE_SIZE); }
        }
        const q = query(collection(db, "summaries"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
        const snap = await getDocs(q);
        if (snap.empty) return;
        const fromFirestore: CachedSummary[] = snap.docs.map((doc) => ({
          id: doc.id, userId: doc.data().userId,
          originalText: doc.data().originalText,
          summary: doc.data().summary,
          language: doc.data().language || "fr",
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        }));
        setCachedSummaries(fromFirestore);
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === PAGE_SIZE);
        await AsyncStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({ data: fromFirestore, timestamp: Date.now() }));
      } catch (e) { console.log("Cache load error:", e); }
    };
    loadCache();
  }, [refreshTrigger]);

  useEffect(() => {
  if (loadId && cachedSummaries.length > 0) {
    const item = cachedSummaries.find((s) => s.id === loadId);
    if (item) handleLoadFromCache(item);
  }
}, [loadId, cachedSummaries]);

  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;
    const user = auth.currentUser;
    if (!user) return;
    setLoadingMore(true);
    try {
      const q = query(collection(db, "summaries"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      if (snap.empty) { setHasMore(false); return; }
      const more: CachedSummary[] = snap.docs.map((doc) => ({
        id: doc.id, userId: doc.data().userId,
        originalText: doc.data().originalText,
        summary: doc.data().summary,
        language: doc.data().language || "fr",
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }));
      const updated = [...cachedSummaries, ...more];
      setCachedSummaries(updated);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setDisplayCount((prev) => prev + PAGE_SIZE);
      await AsyncStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({ data: updated.slice(0, MAX_CACHE_ITEMS), timestamp: Date.now() }));
    } catch (e) { console.log("Load more error:", e); }
    finally { setLoadingMore(false); }
  };

  const handleSummarize = async () => {
    if (inputText.trim().length < 20) { Alert.alert(t("error"), "Saisis au moins 20 caractères à résumer."); return; }
    const allowed = await checkAndConsume();
    if (!allowed) return;
    const { text: limitedText, wasTruncated } = limitInput(inputText, "summary");
    if (wasTruncated) Alert.alert("ℹ️", getTruncationMessage(currentLanguage, 3000));
    const cacheInput = { text: limitedText, language: currentLanguage };
    const cached = await readAICache("summary", cacheInput);
    if (cached) {
      endTracking(true, true);
      setSummary(cached.summary || "");
      setIsFromCache(true); setIsLoading(false); return;
    }
    startTracking(); setIsLoading(true); setSummary(""); setIsSaved(false); setIsFromCache(false);
    try {
      const fn = httpsCallable(functions, "summarize");
      const res = await fn({ text: limitedText, language: currentLanguage });
      const data = res.data as any;
      setSummary(data.summary || "");
      await writeAICache("summary", cacheInput, data);
      endTracking(true);
      await addPoints("SUMMARY");
    } catch (e: any) { endTracking(false); Alert.alert(t("error"), e.message || "La génération a échoué."); }
    finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    if (!summary) return;
    const user = auth.currentUser;
    if (!user) { Alert.alert(t("error"), currentLanguage === "ar" ? "يجب تسجيل الدخول للحفظ" : currentLanguage === "en" ? "You must be logged in to save" : "Tu dois être connecté pour sauvegarder."); return; }
    try {
      const newEntry: CachedSummary = { id: Date.now().toString(), userId: user.uid, originalText: inputText, summary, language: currentLanguage, createdAt: new Date().toISOString() };
      await addDoc(collection(db, "summaries"), { ...newEntry, createdAt: Timestamp.now() });
      trackConv("first_save");
      const updated = [newEntry, ...cachedSummaries].slice(0, MAX_CACHE_ITEMS);
      setCachedSummaries(updated); setHasMore(updated.length >= PAGE_SIZE);
      await AsyncStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({ data: updated, timestamp: Date.now() }));
      setIsSaved(true);
      Alert.alert("✅", t("saved"));
    } catch (e: any) {
      Alert.alert(t("error"), currentLanguage === "ar" ? `فشل الحفظ.\n\n${e?.message || "خطأ غير معروف"}` : currentLanguage === "en" ? `Save failed.\n\n${e?.message || "Unknown error"}` : `La sauvegarde a échoué.\n\n${e?.message || "Erreur inconnue"}`);
    }
  };

  const handleLoadFromCache = (item: CachedSummary) => {
    setInputText(item.originalText); setSummary(item.summary);
    setIsSaved(true); setIsFromCache(true);
  };

  const getMoreLabel = () =>
    currentLanguage === "ar" ? "عرض المزيد" : currentLanguage === "en" ? "Show more" : "Voir plus";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}>
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: C.text, textAlign: isRTL ? "right" : "left" }}>
              {t("summary_screen_title")}
            </Text>
            <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
              {t("generated_by")}
            </Text>
          </View>
        </View>

        <UsageBanner isRTL={isRTL} />

        {/* Cache badge */}
        {isFromCache && (
          <View style={{
            backgroundColor: isDark ? "#022C22" : "#F0FDF4",
            borderRadius: 8, padding: 8,
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", marginBottom: 16, gap: 6,
          }}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={{ fontSize: 13, color: isDark ? "#34D399" : "#065F46" }}>
              {currentLanguage === "ar" ? "محمّل من الذاكرة المحلية"
                : currentLanguage === "en" ? "Loaded from local cache"
                : "Chargé depuis le cache local"}
            </Text>
          </View>
        )}

        {/* Label input */}
        <Text style={{ fontSize: 15, fontWeight: "600", color: C.text, marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
          📝 {t("text_to_summarize")}
        </Text>

        <ImportTextButton
          onTextExtracted={(text) => { setInputText(text); setSummary(""); setIsSaved(false); setIsFromCache(false); }}
          onBeforeImport={async () => { const allowed = await checkAndConsumeFile(); return allowed; }}
          currentLanguage={currentLanguage} isRTL={isRTL}
        />

        {/* Input */}
        <TextInput
          value={inputText} onChangeText={setInputText}
          placeholder={t("text_to_summarize") + "..."}
          placeholderTextColor={C.textTertiary}
          multiline numberOfLines={8}
          textAlign={isRTL ? "right" : "left"}
          style={{
            backgroundColor: C.card, borderWidth: 1, borderColor: C.borderMedium,
            borderRadius: 12, padding: 14, fontSize: 14, color: C.text,
            minHeight: 160, textAlignVertical: "top", marginBottom: 20,
            writingDirection: isRTL ? "rtl" : "ltr",
          }}
        />

        {/* Bouton Résumer */}
        <TouchableOpacity
          onPress={handleSummarize} disabled={isLoading}
          style={{
            backgroundColor: isLoading ? (isDark ? "#3730A3" : "#A5B4FC") : C.primary,
            borderRadius: 14, padding: 16, alignItems: "center", elevation: 4, marginBottom: 24,
          }}
        >
          {isLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 10 }}>{t("summarizing")}</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="sparkles" size={20} color="#FFF" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>{t("summarize_btn")}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Résultat */}
        {summary !== "" && (
          <View>
            {/* Résumé */}
            <View style={{
              backgroundColor: C.primaryLight, borderRadius: 14, padding: 16, marginBottom: 16,
              borderLeftWidth: isRTL ? 0 : 4, borderRightWidth: isRTL ? 4 : 0,
              borderLeftColor: C.primary, borderRightColor: C.primary,
            }}>
              <Text style={{
                fontSize: 14, fontWeight: "700",
                color: isDark ? C.primaryDark : "#3730A3",
                marginBottom: 8, textAlign: isRTL ? "right" : "left",
              }}>
                📋 {t("summary_result")}
              </Text>
              <Text style={{
                fontSize: 14,
                color: isDark ? C.primaryDark : "#3730A3",
                lineHeight: 22, textAlign: isRTL ? "right" : "left",
                writingDirection: isRTL ? "rtl" : "ltr",
              }}>
                {summary}
              </Text>
            </View>

            {/* Actions principales */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12, marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => { setSummary(""); setInputText(""); setIsSaved(false); setIsFromCache(false); }}
                style={{
                  flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
                  backgroundColor: isDark ? C.card : "#F3F4F6",
                  borderWidth: 1, borderColor: C.border,
                }}
              >
                <Text style={{ fontWeight: "600", color: C.text, fontSize: 15 }}>🔄 {t("new")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave} disabled={isSaved}
                style={{ flex: 1, borderRadius: 12, padding: 14, alignItems: "center", backgroundColor: isSaved ? "#10B981" : C.primary }}
              >
                <Text style={{ fontWeight: "600", color: "#FFF", fontSize: 15 }}>
                  {isSaved ? `✅ ${t("saved")}` : `💾 ${t("save")}`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Actions secondaires */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12 }}>
              <TouchableOpacity
                onPress={async () => { await Clipboard.setStringAsync(summary); Alert.alert("✅", currentLanguage === "ar" ? "تم النسخ!" : currentLanguage === "en" ? "Copied!" : "Copié !"); }}
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
                onPress={async () => { await Share.share({ message: `📋 ${currentLanguage === "ar" ? "ملخص" : currentLanguage === "en" ? "Summary" : "Résumé"} — StudyAI\n\n${summary}` }); }}
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
        {cachedSummaries.length > 0 && summary === "" && (
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: C.text, textAlign: isRTL ? "right" : "left" }}>
                🕒 {currentLanguage === "ar" ? "الملخصات المحفوظة" : currentLanguage === "en" ? "Saved Summaries" : "Résumés sauvegardés"}
              </Text>
              <TouchableOpacity onPress={() => confirmDeleteAll("summaries", "Résumés", currentLanguage, () => setCachedSummaries([]))}>
                <Text style={{ fontSize: 12, color: C.danger, fontWeight: "600" }}>
                  {currentLanguage === "ar" ? "حذف الكل" : currentLanguage === "en" ? "Clear all" : "Tout effacer"}
                </Text>
              </TouchableOpacity>
            </View>

            {cachedSummaries.slice(0, displayCount).map((item) => (
              <TouchableOpacity
                key={item.id} onPress={() => handleLoadFromCache(item)}
                style={{
                  backgroundColor: C.card, borderRadius: 12, padding: 14,
                  marginBottom: 10, borderWidth: 1, borderColor: C.border, elevation: 1,
                }}
              >
                <Text style={{ fontSize: 13, color: C.text, lineHeight: 18, textAlign: isRTL ? "right" : "left" } as any} numberOfLines={2}>
                  {item.summary}
                </Text>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <Text style={{ fontSize: 11, color: C.textTertiary }}>
                    {new Date(item.createdAt).toLocaleDateString(currentLanguage === "ar" ? "ar-SA" : currentLanguage === "en" ? "en-GB" : "fr-FR")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => confirmDeleteOne(
                      "summaries", item.id, item.summary?.slice(0, 30) || "résumé", currentLanguage,
                      () => setCachedSummaries((prev: any[]) => prev.filter((x) => x.id !== item.id)),
                      async () => {
                        const user = auth.currentUser;
                        if (!user) return;
                        const updated = cachedSummaries.filter((x: any) => x.id !== item.id);
                        await AsyncStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({ data: updated, timestamp: Date.now() }));
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