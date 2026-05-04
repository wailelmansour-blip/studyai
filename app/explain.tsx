// app/explain.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
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
import { useDeleteHistory } from "../hooks/useDeleteHistory"; // ← AJOUT Phase 17
import { ImportTextButton } from "../components/ImportTextButton";

const CACHE_KEY = "studyai_explanations";
const CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_CACHE_ITEMS = 10;
const PAGE_SIZE = 5;

interface CachedExplanation {
  id: string;
  userId: string;
  inputText: string;
  explanation: string;
  keyPoints: string[];
  difficulty: string;
  createdAt: string;
}

export default function ExplainScreen() {
  const app = getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, "us-central1");
  const { saveExplanation, isLoading } = useAiStore();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const isRTL = currentLanguage === "ar";
  const { checkAndConsume } = useAIRequest();
  const { confirmDeleteOne, confirmDeleteAll } = useDeleteHistory();
  const { startTracking, endTracking, trackConv, trackView } = useAnalytics("explain"); // ← AJOUT Phase 17

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

  useEffect(() => {
    trackView(); // ← AJOUT Phase 17

    const loadCache = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Afficher le cache local immédiatement (UX rapide)
    const raw = await AsyncStorage.getItem(`${CACHE_KEY}_${user.uid}`);
    if (raw) {
      const { data } = JSON.parse(raw);
      if (data?.length > 0) {
        setCachedExplanations(data);
        setHasMore(data.length >= PAGE_SIZE);
      }
    }

    // 2. Toujours charger Firestore pour avoir les données à jour
    const q = query(
      collection(db, "explanations"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const fromFirestore: CachedExplanation[] = snap.docs.map((doc) => ({
      id: doc.id,
      userId: doc.data().userId,
      inputText: doc.data().inputText || doc.data().text || "",
      explanation: doc.data().explanation || "",
      keyPoints: doc.data().keyPoints || [],
      difficulty: doc.data().difficulty || "moyen",
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }));

    // 3. Mettre à jour UI + cache avec données Firestore
    setCachedExplanations(fromFirestore);
    setLastDoc(snap.docs[snap.docs.length - 1]);
    setHasMore(snap.docs.length === PAGE_SIZE);

    await AsyncStorage.setItem(
      `${CACHE_KEY}_${user.uid}`,
      JSON.stringify({ data: fromFirestore, timestamp: Date.now() })
    );
  } catch (e) {
    console.log("Explain cache load error:", e);
  }
};
    loadCache();
  }, []);

  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;
    const user = auth.currentUser;
    if (!user) return;

    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "explanations"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      if (snap.empty) { setHasMore(false); return; }

      const more: CachedExplanation[] = snap.docs.map((doc) => ({
        id: doc.id,
        userId: doc.data().userId,
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

      await AsyncStorage.setItem(
        `${CACHE_KEY}_${user.uid}`,
        JSON.stringify({ data: updated.slice(0, MAX_CACHE_ITEMS), timestamp: Date.now() })
      );
    } catch (e) {
      console.log("Load more explanations error:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const getMoreLabel = () => {
    if (currentLanguage === "ar") return "عرض المزيد";
    if (currentLanguage === "en") return "Show more";
    return "Voir plus";
  };

  const handleLoadFromHistory = (item: CachedExplanation) => {
    setText(item.inputText);
    setResult({
      userId: item.userId,
      inputText: item.inputText,
      explanation: item.explanation,
      keyPoints: item.keyPoints,
      difficulty: item.difficulty as any,
      createdAt: item.createdAt,
    });
    setSaved(true);
  };

  const difficultyColors: Record<string, string> = {
    facile: "#10B981",
    moyen: "#F59E0B",
    difficile: "#EF4444",
  };

  const difficultyLabels = {
    facile: currentLanguage === "ar" ? "سهل" : currentLanguage === "en" ? "Easy" : "Facile",
    moyen: currentLanguage === "ar" ? "متوسط" : currentLanguage === "en" ? "Medium" : "Moyen",
    difficile: currentLanguage === "ar" ? "صعب" : currentLanguage === "en" ? "Hard" : "Difficile",
  };

  const handleExplain = async () => {
    if (text.trim().length < 10) {
      Alert.alert(t("error"), "Saisis au moins 10 caractères.");
      return;
    }

    const allowed = await checkAndConsume();
    if (!allowed) return;

    const { text: limitedText, wasTruncated } = limitInput(text, "explain");
    if (wasTruncated) {
      Alert.alert("ℹ️", getTruncationMessage(currentLanguage, 2000));
    }

    const cacheInput = { text: limitedText, difficulty, language: currentLanguage };
    const cached = await readAICache("explain", cacheInput);
    if (cached) {
      endTracking(true, true); // ← AJOUT Phase 17 — cache hit
      setResult({
        userId: auth.currentUser?.uid || "anonymous",
        inputText: text,
        explanation: cached.explanation || "",
        keyPoints: cached.keyPoints || [],
        difficulty: cached.difficulty || difficulty,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    startTracking(); // ← AJOUT Phase 17
    setGenerating(true);
    setResult(null);
    setSaved(false);
    try {
      const fn = httpsCallable(functions, "explainText");
      const res = await fn({ text: limitedText, difficulty, language: currentLanguage });
      const data = res.data as any;
      setResult({
        userId: auth.currentUser?.uid || "anonymous",
        inputText: text,
        explanation: data.explanation || "",
        keyPoints: data.keyPoints || [],
        difficulty: data.difficulty || difficulty,
        createdAt: new Date().toISOString(),
      });
      await writeAICache("explain", cacheInput, data);
      endTracking(true); // ← AJOUT Phase 17 — succès
    } catch (e: any) {
      endTracking(false); // ← AJOUT Phase 17 — échec
      Alert.alert(t("error"), e.message || "La génération a échoué.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert(
        t("error"),
        currentLanguage === "ar" ? "يجب تسجيل الدخول للحفظ"
        : currentLanguage === "en" ? "You must be logged in to save"
        : "Tu dois être connecté pour sauvegarder."
      );
      return;
    }

    try {
      await saveExplanation(result);
      setSaved(true);
      trackConv("first_save"); // ← AJOUT Phase 17

      const newEntry: CachedExplanation = {
        id: Date.now().toString(),
        userId: user.uid,
        inputText: result.inputText,
        explanation: result.explanation,
        keyPoints: result.keyPoints,
        difficulty: result.difficulty,
        createdAt: result.createdAt,
      };
      const updated = [newEntry, ...cachedExplanations].slice(0, MAX_CACHE_ITEMS);
      setCachedExplanations(updated);
      setHasMore(updated.length >= PAGE_SIZE);
      await AsyncStorage.setItem(
        `${CACHE_KEY}_${user.uid}`,
        JSON.stringify({ data: updated, timestamp: Date.now() })
      );

      Alert.alert("✅", t("saved"));
    } catch (e: any) {
      console.error("Erreur sauvegarde explanation:", e);
      Alert.alert(
        t("error"),
        currentLanguage === "ar"
          ? `فشل الحفظ.\n\n${e?.message || e?.code || "خطأ غير معروف"}`
          : currentLanguage === "en"
          ? `Save failed.\n\n${e?.message || e?.code || "Unknown error"}`
          : `La sauvegarde a échoué.\n\n${e?.message || e?.code || "Erreur inconnue"}`
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", marginBottom: 24,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}
          >
            <Ionicons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={24} color="#374151"
            />
          </TouchableOpacity>
          <View>
            <Text style={{
              fontSize: 22, fontWeight: "700", color: "#111827",
              textAlign: isRTL ? "right" : "left",
            }}>
              {t("explain_title_screen")}
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
              {t("generated_by")}
            </Text>
          </View>
        </View>

        <UsageBanner isRTL={isRTL} />

        {/* Input */}
        <Text style={{
          fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 8,
          textAlign: isRTL ? "right" : "left",
        }}>
          📝 {t("text_to_explain")}
        </Text>

        <ImportTextButton
  onTextExtracted={(text) => {
    setText(text);
    setResult(null);
    setSaved(false);
  }}
  currentLanguage={currentLanguage}
  isRTL={isRTL}
/>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("text_to_explain") + "..."}
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={6}
          textAlign={isRTL ? "right" : "left"}
          style={{
            backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
            borderRadius: 12, padding: 14, fontSize: 14, color: "#111827",
            minHeight: 140, textAlignVertical: "top", marginBottom: 20,
            writingDirection: isRTL ? "rtl" : "ltr",
          }}
        />

        {/* Niveau */}
        <Text style={{
          fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 10,
          textAlign: isRTL ? "right" : "left",
        }}>
          🎯 {t("level")}
        </Text>
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          gap: 10, marginBottom: 24,
        }}>
          {(["facile", "moyen", "difficile"] as const).map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => setDifficulty(d)}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
                backgroundColor: difficulty === d ? difficultyColors[d] : "#FFFFFF",
                borderWidth: 1,
                borderColor: difficulty === d ? difficultyColors[d] : "#E5E7EB",
              }}
            >
              <Text style={{
                fontWeight: "600", fontSize: 13,
                color: difficulty === d ? "#FFFFFF" : "#374151",
              }}>
                {difficultyLabels[d]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bouton */}
        <TouchableOpacity
          onPress={handleExplain}
          disabled={generating}
          style={{
            backgroundColor: generating ? "#A5B4FC" : "#6366F1",
            borderRadius: 14, padding: 16, alignItems: "center",
            elevation: 4, marginBottom: 24,
          }}
        >
          {generating ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 10 }}>
                {t("explaining")}
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="bulb-outline" size={20} color="#FFF" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>
                {t("explain_btn")}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Résultat */}
        {result && (
          <View>
            <View style={{
              backgroundColor: "#EEF2FF", borderRadius: 14, padding: 16, marginBottom: 14,
              borderLeftWidth: isRTL ? 0 : 4,
              borderRightWidth: isRTL ? 4 : 0,
              borderLeftColor: "#6366F1",
              borderRightColor: "#6366F1",
            }}>
              <Text style={{
                fontSize: 14, fontWeight: "700", color: "#3730A3", marginBottom: 8,
                textAlign: isRTL ? "right" : "left",
              }}>
                💡 {t("explanation")}
              </Text>
              <Text style={{
                fontSize: 14, color: "#3730A3", lineHeight: 22,
                textAlign: isRTL ? "right" : "left",
                writingDirection: isRTL ? "rtl" : "ltr",
              }}>
                {result.explanation}
              </Text>
            </View>

            {result.keyPoints.length > 0 && (
              <View style={{
                backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16,
                marginBottom: 14, borderWidth: 1, borderColor: "#E5E7EB",
              }}>
                <Text style={{
                  fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 10,
                  textAlign: isRTL ? "right" : "left",
                }}>
                  🔑 {t("key_points")}
                </Text>
                {result.keyPoints.map((point, i) => (
                  <View key={i} style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "flex-start", marginBottom: 6,
                  }}>
                    <View style={{
                      width: 20, height: 20, borderRadius: 10, backgroundColor: "#EEF2FF",
                      alignItems: "center", justifyContent: "center",
                      marginRight: isRTL ? 0 : 10,
                      marginLeft: isRTL ? 10 : 0,
                      marginTop: 1,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#6366F1" }}>
                        {i + 1}
                      </Text>
                    </View>
                    <Text style={{
                      fontSize: 13, color: "#374151", flex: 1, lineHeight: 20,
                      textAlign: isRTL ? "right" : "left",
                      writingDirection: isRTL ? "rtl" : "ltr",
                    }}>
                      {point}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center", marginBottom: 16,
            }}>
              <View style={{
                backgroundColor: difficultyColors[result.difficulty] + "20",
                borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
              }}>
                <Text style={{
                  fontSize: 13, fontWeight: "600",
                  color: difficultyColors[result.difficulty],
                }}>
                  {t("level")} : {difficultyLabels[result.difficulty]}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => { setResult(null); setSaved(false); setText(""); }}
                style={{
                  flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
                  backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
                }}
              >
                <Text style={{ fontWeight: "600", color: "#374151", fontSize: 15 }}>
                  🔄 {t("new")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saved || isLoading}
                style={{
                  flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
                  backgroundColor: saved ? "#10B981" : "#6366F1",
                }}
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
          </View>
        )}

        {/* Historique explications */}
        {cachedExplanations.length > 0 && !result && (
          <View style={{ marginTop: 24 }}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827", textAlign: isRTL ? "right" : "left" }}>
              🕒 {currentLanguage === "ar" ? "الشروحات المحفوظة"
                : currentLanguage === "en" ? "Saved Explanations"
                : "Explications sauvegardées"}
            </Text>
            <TouchableOpacity
              onPress={() => confirmDeleteAll("explanations", "Explications sauvegardées", currentLanguage, () => setCachedExplanations([]))}
            >
              <Text style={{ fontSize: 12, color: "#EF4444", fontWeight: "600" }}>
                {currentLanguage === "ar" ? "حذف الكل" : currentLanguage === "en" ? "Clear all" : "Tout effacer"}
              </Text>
            </TouchableOpacity>
          </View>
            {cachedExplanations.slice(0, displayCount).map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleLoadFromHistory(item)}
                style={{
                  backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14,
                  marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB",
                  elevation: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 13, color: "#374151", lineHeight: 18,
                    textAlign: isRTL ? "right" : "left",
                  } as any}
                  numberOfLines={2}
                >
                  {item.explanation}
                </Text>
                <View style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  justifyContent: "space-between", marginTop: 6,
                }}>
                  <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
                    {new Date(item.createdAt).toLocaleDateString(
                      currentLanguage === "ar" ? "ar-SA"
                      : currentLanguage === "en" ? "en-GB" : "fr-FR"
                    )}
                  </Text>
                  <View style={{
                    backgroundColor: difficultyColors[item.difficulty] + "20",
                    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1,
                  }}>
                    <Text style={{ fontSize: 10, color: difficultyColors[item.difficulty], fontWeight: "600" }}>
                      {difficultyLabels[item.difficulty as keyof typeof difficultyLabels]}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmDeleteOne(
                      "explanations", item.id, item.explanation?.slice(0,30) || "explication", currentLanguage,
                      () => setCachedExplanations((prev: any[]) => prev.filter((x) => x.id !== item.id)),
                      async () => {
                        const user = auth.currentUser;
                        if (!user) return;
                        const updated = cachedExplanations.filter((x: any) => x.id !== item.id);
                        await AsyncStorage.setItem(`studyai_explanations_${user.uid}`, JSON.stringify({ data: updated, timestamp: Date.now() }));
                      }
                    )}
                  >
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}

            {hasMore && (
              <TouchableOpacity
                onPress={handleLoadMore}
                disabled={loadingMore}
                style={{
                  borderRadius: 12, padding: 14, alignItems: "center",
                  backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
                  marginTop: 4,
                }}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color="#6366F1" />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="chevron-down" size={16} color="#6366F1" />
                    <Text style={{ fontWeight: "600", color: "#6366F1", fontSize: 14 }}>
                      {getMoreLabel()}
                    </Text>
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