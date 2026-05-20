// app/flashcards.tsx
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
import { FlashcardsResult, Flashcard } from "../types/ai";
import { useAiStore } from "../store/aiStore";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../store/languageStore";
import { useAIRequest } from "../hooks/useAIRequest";
import { UsageBanner } from "../components/UsageBanner";
import { readAICache, writeAICache } from "../store/aiCacheStore";
import { limitInput } from "../utils/inputLimiter";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDeleteHistory } from "../hooks/useDeleteHistory";
import { useHistoryStore } from "../store/historyStore";
import { useStreakStore } from "../store/streakStore";
import { useThemeStore } from "../store/themeStore";
import { Colors } from "../constants/colors";
import { useLocalSearchParams } from "expo-router";

const CACHE_KEY = "studyai_flashcards";
const MAX_CACHE_ITEMS = 10;
const PAGE_SIZE = 5;

interface CachedFlashcard {
  id: string; userId: string; topic: string;
  flashcards: { question: string; answer: string }[];
  createdAt: string;
}

export default function FlashcardsScreen() {
  const app = getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, "us-central1");
  const { saveFlashcards, isLoading } = useAiStore();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const { isDark } = useThemeStore();
  const C = isDark ? Colors.dark : Colors.light;
  const isRTL = currentLanguage === "ar";
  const { checkAndConsume } = useAIRequest();
  const { confirmDeleteOne, confirmDeleteAll } = useDeleteHistory();
  const refreshTrigger = useHistoryStore((state) => state.refreshTrigger["flashcards"] || 0);
  const { startTracking, endTracking, trackConv, trackView } = useAnalytics("flashcards");
  const { addPoints } = useStreakStore();

  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("8");
  const [result, setResult] = useState<FlashcardsResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [currentCard, setCurrentCard] = useState(0);
  const [cachedFlashcards, setCachedFlashcards] = useState<CachedFlashcard[]>([]);
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
          if (data?.length > 0) { setCachedFlashcards(data); setHasMore(data.length >= PAGE_SIZE); }
        }
        const q = query(collection(db, "flashcards"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
        const snap = await getDocs(q);
        if (snap.empty) return;
        const fromFirestore: CachedFlashcard[] = snap.docs.map((doc) => ({
          id: doc.id, userId: doc.data().userId, topic: doc.data().topic || "",
          flashcards: doc.data().cards || doc.data().flashcards || [],
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        }));
        setCachedFlashcards(fromFirestore);
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === PAGE_SIZE);
        await AsyncStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({ data: fromFirestore, timestamp: Date.now() }));
      } catch (e) { console.log("Flashcards cache load error:", e); }
    };
    loadCache();
  }, [refreshTrigger]);

  useEffect(() => {
  if (loadId && cachedFlashcards.length > 0) {
    const item = cachedFlashcards.find((f) => f.id === loadId);
    if (item) handleLoadFromHistory(item);
  }
}, [loadId, cachedFlashcards]);

  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;
    const user = auth.currentUser;
    if (!user) return;
    setLoadingMore(true);
    try {
      const q = query(collection(db, "flashcards"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      if (snap.empty) { setHasMore(false); return; }
      const more: CachedFlashcard[] = snap.docs.map((doc) => ({
        id: doc.id, userId: doc.data().userId, topic: doc.data().topic || "",
        flashcards: doc.data().cards || doc.data().flashcards || [],
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }));
      const updated = [...cachedFlashcards, ...more];
      setCachedFlashcards(updated);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setDisplayCount((prev) => prev + PAGE_SIZE);
      await AsyncStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({ data: updated.slice(0, MAX_CACHE_ITEMS), timestamp: Date.now() }));
    } catch (e) { console.log("Load more flashcards error:", e); }
    finally { setLoadingMore(false); }
  };

  const getMoreLabel = () =>
    currentLanguage === "ar" ? "عرض المزيد" : currentLanguage === "en" ? "Show more" : "Voir plus";

  const handleLoadFromHistory = (item: CachedFlashcard) => {
    setResult({ userId: item.userId, topic: item.topic, flashcards: item.flashcards, createdAt: item.createdAt });
    setFlipped({}); setCurrentCard(0); setSaved(true);
  };

  const getShareContent = () => {
    if (!result) return "";
    const cardsText = result.flashcards.map((card, i) => `${i + 1}. ❓ ${card.question}\n   ✅ ${card.answer}`).join("\n\n");
    return `🃏 ${currentLanguage === "ar" ? "بطاقات تعليمية" : currentLanguage === "en" ? "Flashcards" : "Flashcards"} — StudyAI\n\n📚 ${result.topic}\n\n${cardsText}`;
  };

  const handleGenerate = async () => {
    if (topic.trim().length < 3) { Alert.alert(t("error"), "Saisis un sujet pour les flashcards."); return; }
    const allowed = await checkAndConsume();
    if (!allowed) return;
    const { text: limitedTopic } = limitInput(topic, "flashcards");
    const cacheInput = { topic: limitedTopic, count, language: currentLanguage };
    const cached = await readAICache("flashcards", cacheInput);
    if (cached?.flashcards?.length > 0) {
      endTracking(true, true);
      setResult({ userId: auth.currentUser?.uid || "anonymous", topic, flashcards: cached.flashcards, createdAt: new Date().toISOString() });
      setFlipped({}); setCurrentCard(0); return;
    }
    startTracking(); setGenerating(true); setResult(null); setSaved(false); setFlipped({}); setCurrentCard(0);
    try {
      const fn = httpsCallable(functions, "generateFlashcards");
      const res = await fn({ topic: limitedTopic, count: parseInt(count), language: currentLanguage });
      const data = res.data as any;
      setResult({ userId: auth.currentUser?.uid || "anonymous", topic, flashcards: data.flashcards || [], createdAt: new Date().toISOString() });
      await writeAICache("flashcards", cacheInput, data);
      endTracking(true);
      await addPoints("FLASHCARDS");
    } catch (e: any) { endTracking(false); Alert.alert(t("error"), e.message || "La génération a échoué."); }
    finally { setGenerating(false); }
  };

  const handleSave = async () => {
    if (!result) return;
    const user = auth.currentUser;
    if (!user) { Alert.alert(t("error"), currentLanguage === "ar" ? "يجب تسجيل الدخول للحفظ" : currentLanguage === "en" ? "You must be logged in to save" : "Tu dois être connecté pour sauvegarder."); return; }
    try {
      await saveFlashcards(result);
      setSaved(true); trackConv("first_save");
      const newEntry: CachedFlashcard = { id: Date.now().toString(), userId: user.uid, topic: result.topic, flashcards: result.flashcards, createdAt: result.createdAt };
      const updated = [newEntry, ...cachedFlashcards].slice(0, MAX_CACHE_ITEMS);
      setCachedFlashcards(updated); setHasMore(updated.length >= PAGE_SIZE);
      await AsyncStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({ data: updated, timestamp: Date.now() }));
      Alert.alert("✅", t("saved"));
    } catch (e: any) {
      Alert.alert(t("error"), currentLanguage === "ar" ? `فشل الحفظ.\n\n${e?.message || "خطأ غير معروف"}` : currentLanguage === "en" ? `Save failed.\n\n${e?.message || "Unknown error"}` : `La sauvegarde a échoué.\n\n${e?.message || "Erreur inconnue"}`);
    }
  };

  const toggleFlip = (index: number) => setFlipped((prev) => ({ ...prev, [index]: !prev[index] }));
  const card = result?.flashcards[currentCard];
  const total = result?.flashcards.length || 0;
  const isFlipped = flipped[currentCard];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => {
              if (result) {
                Alert.alert(
                  currentLanguage === "ar" ? "إلغاء البطاقات" : currentLanguage === "en" ? "Cancel Flashcards" : "Annuler les flashcards",
                  currentLanguage === "ar" ? "هل تريد الخروج؟" : currentLanguage === "en" ? "Do you want to exit?" : "Veux-tu quitter ?",
                  [
                    { text: currentLanguage === "ar" ? "متابعة" : currentLanguage === "en" ? "Continue" : "Continuer", style: "cancel" },
                    { text: currentLanguage === "ar" ? "خروج" : currentLanguage === "en" ? "Exit" : "Quitter", style: "destructive",
                      onPress: () => { setResult(null); setSaved(false); setTopic(""); setFlipped({}); setCurrentCard(0); }
                    },
                  ]
                );
              } else { router.back(); }
            }}
            style={{ marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}
          >
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={C.text} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "700", color: C.text, textAlign: isRTL ? "right" : "left" }}>
              {t("flashcards_title_screen")}
            </Text>
            <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>{t("generated_by")}</Text>
          </View>
        </View>

        <UsageBanner isRTL={isRTL} />

        {/* ── FORM ── */}
        {!result && (
          <View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: C.text, marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
              🧠 {t("topic")}
            </Text>
            <TextInput
              value={topic} onChangeText={setTopic}
              placeholder={t("topic") + "..."}
              placeholderTextColor={C.textTertiary}
              textAlign={isRTL ? "right" : "left"}
              style={{
                backgroundColor: C.card, borderWidth: 1, borderColor: C.borderMedium,
                borderRadius: 12, padding: 14, fontSize: 14, color: C.text,
                marginBottom: 20, writingDirection: isRTL ? "rtl" : "ltr",
              }}
            />

            <Text style={{ fontSize: 15, fontWeight: "600", color: C.text, marginBottom: 10, textAlign: isRTL ? "right" : "left" }}>
              🃏 {t("cards_count")}
            </Text>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10, marginBottom: 28 }}>
              {["5", "8", "10", "15", "20"].map((n) => (
                <TouchableOpacity
                  key={n} onPress={() => setCount(n)}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
                    backgroundColor: count === n ? C.primary : C.card,
                    borderWidth: 1, borderColor: count === n ? C.primary : C.borderMedium,
                  }}
                >
                  <Text style={{ fontWeight: "600", fontSize: 15, color: count === n ? "#FFF" : C.text }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleGenerate} disabled={generating}
              style={{
                backgroundColor: generating ? (isDark ? "#3730A3" : "#A5B4FC") : C.primary,
                borderRadius: 14, padding: 16, alignItems: "center", elevation: 4,
              }}
            >
              {generating ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 10 }}>{t("generating")}</Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="layers-outline" size={20} color="#FFF" />
                  <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>{t("generate_flashcards")}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Historique */}
            {cachedFlashcards.length > 0 && (
              <View style={{ marginTop: 28 }}>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: C.text, textAlign: isRTL ? "right" : "left" }}>
                    🕒 {currentLanguage === "ar" ? "البطاقات المحفوظة" : currentLanguage === "en" ? "Saved Flashcards" : "Flashcards sauvegardées"}
                  </Text>
                  <TouchableOpacity onPress={() => confirmDeleteAll("flashcards", "Flashcards", currentLanguage, () => setCachedFlashcards([]))}>
                    <Text style={{ fontSize: 12, color: C.danger, fontWeight: "600" }}>
                      {currentLanguage === "ar" ? "حذف الكل" : currentLanguage === "en" ? "Clear all" : "Tout effacer"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {cachedFlashcards.slice(0, displayCount).map((item) => (
                  <TouchableOpacity
                    key={item.id} onPress={() => handleLoadFromHistory(item)}
                    style={{
                      backgroundColor: C.card, borderRadius: 12, padding: 14,
                      marginBottom: 10, borderWidth: 1, borderColor: C.border, elevation: 1,
                    }}
                  >
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: C.text, flex: 1, textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>
                        🧠 {item.topic}
                      </Text>
                      <View style={{ backgroundColor: C.primaryLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                        <Text style={{ fontSize: 11, color: C.primary, fontWeight: "600" }}>
                          {item.flashcards.length} {currentLanguage === "ar" ? "بطاقة" : currentLanguage === "en" ? "cards" : "cartes"}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                      <Text style={{ fontSize: 11, color: C.textTertiary }}>
                        {new Date(item.createdAt).toLocaleDateString(currentLanguage === "ar" ? "ar-SA" : currentLanguage === "en" ? "en-GB" : "fr-FR")}
                      </Text>
                      <TouchableOpacity
                        onPress={() => confirmDeleteOne(
                          "flashcards", item.id, item.topic, currentLanguage,
                          () => setCachedFlashcards((prev) => prev.filter((f) => f.id !== item.id)),
                          async () => {
                            const user = auth.currentUser;
                            if (!user) return;
                            const updated = cachedFlashcards.filter((f) => f.id !== item.id);
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
          </View>
        )}

        {/* ── RÉSULTAT ── */}
        {result && card && (
          <View>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: C.textSecondary }}>📚 {result.topic}</Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: C.primary }}>
                {isRTL ? `${total} / ${currentCard + 1}` : `${currentCard + 1} / ${total}`}
              </Text>
            </View>

            {/* Carte flip */}
            <TouchableOpacity
              onPress={() => toggleFlip(currentCard)}
              activeOpacity={0.85}
              style={{
                backgroundColor: isFlipped
                  ? (isDark ? "#3730A3" : "#6366F1")
                  : C.card,
                borderRadius: 20, padding: 32, minHeight: 200,
                alignItems: "center", justifyContent: "center",
                marginBottom: 16, elevation: 4,
                borderWidth: 1,
                borderColor: isFlipped ? C.primary : C.borderMedium,
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: "600", marginBottom: 16,
                color: isFlipped ? "#C7D2FE" : C.textTertiary,
                textTransform: "uppercase", letterSpacing: 1,
              }}>
                {isFlipped ? t("answer") : t("question")}
              </Text>
              <Text style={{
                fontSize: 16, fontWeight: "600", textAlign: "center", lineHeight: 24,
                color: isFlipped ? "#FFFFFF" : C.text,
                writingDirection: isRTL ? "rtl" : "ltr",
              }}>
                {isFlipped ? card.answer : card.question}
              </Text>
              <Text style={{ fontSize: 12, marginTop: 20, color: isFlipped ? "#C7D2FE" : C.textTertiary }}>
                {t("tap_to_flip")}
              </Text>
            </TouchableOpacity>

            {/* Navigation cartes */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => { if (currentCard > 0) { setCurrentCard(currentCard - 1); setFlipped((prev) => ({ ...prev, [currentCard]: false })); } }}
                disabled={currentCard === 0}
                style={{
                  flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
                  backgroundColor: currentCard === 0 ? (isDark ? "#0F172A" : "#F9FAFB") : (isDark ? C.card : "#F3F4F6"),
                  borderWidth: 1, borderColor: C.border,
                }}
              >
                <Text style={{ fontWeight: "600", fontSize: 15, color: currentCard === 0 ? C.textTertiary : C.text }}>
                  {t("previous")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { if (currentCard < total - 1) { setCurrentCard(currentCard + 1); setFlipped((prev) => ({ ...prev, [currentCard]: false })); } }}
                disabled={currentCard === total - 1}
                style={{
                  flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
                  backgroundColor: currentCard === total - 1 ? (isDark ? "#0F172A" : "#F9FAFB") : C.primary,
                  borderWidth: 1, borderColor: currentCard === total - 1 ? C.border : C.primary,
                }}
              >
                <Text style={{ fontWeight: "600", fontSize: 15, color: currentCard === total - 1 ? C.textTertiary : "#FFF" }}>
                  {t("next_card")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Barre progression */}
            <View style={{ height: 4, backgroundColor: C.borderMedium, borderRadius: 2, marginBottom: 20 }}>
              <View style={{
                height: 4, borderRadius: 2, backgroundColor: C.primary,
                width: `${((currentCard + 1) / total) * 100}%`,
                alignSelf: isRTL ? "flex-end" : "flex-start",
              }} />
            </View>

            {/* Actions principales */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12, marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => { setResult(null); setSaved(false); setTopic(""); }}
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
      </ScrollView>
    </SafeAreaView>
  );
}