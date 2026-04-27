// app/flashcards.tsx
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { FlashcardsResult, Flashcard } from "../types/ai";
import { useAiStore } from "../store/aiStore";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../store/languageStore";
import { useAIRequest } from "../hooks/useAIRequest";    // ← AJOUT Phase 14
import { UsageBanner } from "../components/UsageBanner"; // ← AJOUT Phase 14
import { readAICache, writeAICache } from "../store/aiCacheStore"; // ← Phase 15
import { limitInput } from "../utils/inputLimiter";                // ← Phase 15

export default function FlashcardsScreen() {
  const app = getApp();
  const auth = getAuth(app);
  const functions = getFunctions(app, "us-central1");
  const { saveFlashcards, isLoading } = useAiStore();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const isRTL = currentLanguage === "ar";
  const { checkAndConsume } = useAIRequest(); // ← AJOUT Phase 14

  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("8");
  const [result, setResult] = useState<FlashcardsResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [currentCard, setCurrentCard] = useState(0);

  const handleGenerate = async () => {
  if (topic.trim().length < 3) {
    Alert.alert(t("error"), "Saisis un sujet pour les flashcards.");
    return;
  }

  const allowed = await checkAndConsume();
  if (!allowed) return;

  // Phase 15 — limiter input
  const { text: limitedTopic } = limitInput(topic, "flashcards");

  // Phase 15 — vérifier cache
  const cacheInput = { topic: limitedTopic, count, language: currentLanguage };
  const cached = await readAICache("flashcards", cacheInput);
  if (cached?.flashcards?.length > 0) {
    setResult({
      userId: auth.currentUser?.uid || "anonymous",
      topic,
      flashcards: cached.flashcards,
      createdAt: new Date().toISOString(),
    });
    setFlipped({});
    setCurrentCard(0);
    return;
  }

  setGenerating(true);
  setResult(null);
  setSaved(false);
  setFlipped({});
  setCurrentCard(0);
  try {
    const fn = httpsCallable(functions, "generateFlashcards");
    const res = await fn({ topic: limitedTopic, count: parseInt(count), language: currentLanguage });
    const data = res.data as any;
    setResult({
      userId: auth.currentUser?.uid || "anonymous",
      topic,
      flashcards: data.flashcards || [],
      createdAt: new Date().toISOString(),
    });
    // Phase 15 — sauvegarder cache
    await writeAICache("flashcards", cacheInput, data);
  } catch (e: any) {
    Alert.alert(t("error"), e.message || "La génération a échoué.");
  } finally {
    setGenerating(false);
  }
};

  const handleSave = async () => {
    if (!result) return;
    try {
      await saveFlashcards(result);
      setSaved(true);
      Alert.alert("✅", t("saved"));
    } catch {
      Alert.alert(t("error"), "La sauvegarde a échoué.");
    }
  };

  const toggleFlip = (index: number) => {
    setFlipped((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const card = result?.flashcards[currentCard];
  const total = result?.flashcards.length || 0;

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
              {t("flashcards_title_screen")}
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
              {t("generated_by")}
            </Text>
          </View>
        </View>

        {/* ── Phase 14 : Bandeau usage ── */}
        <UsageBanner isRTL={isRTL} />

        {/* Form */}
        {!result && (
          <View>
            <Text style={{
              fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 8,
              textAlign: isRTL ? "right" : "left",
            }}>
              🧠 {t("topic")}
            </Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder={t("topic") + "..."}
              placeholderTextColor="#9CA3AF"
              textAlign={isRTL ? "right" : "left"}
              style={{
                backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
                borderRadius: 12, padding: 14, fontSize: 14, color: "#111827",
                marginBottom: 20, writingDirection: isRTL ? "rtl" : "ltr",
              }}
            />

            <Text style={{
              fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 10,
              textAlign: isRTL ? "right" : "left",
            }}>
              🃏 {t("cards_count")}
            </Text>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              gap: 10, marginBottom: 28,
            }}>
              {["5", "8", "10", "15", "20"].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setCount(n)}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
                    backgroundColor: count === n ? "#6366F1" : "#FFFFFF",
                    borderWidth: 1, borderColor: count === n ? "#6366F1" : "#E5E7EB",
                  }}
                >
                  <Text style={{
                    fontWeight: "600", fontSize: 15,
                    color: count === n ? "#FFFFFF" : "#374151",
                  }}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleGenerate}
              disabled={generating}
              style={{
                backgroundColor: generating ? "#A5B4FC" : "#6366F1",
                borderRadius: 14, padding: 16, alignItems: "center", elevation: 4,
              }}
            >
              {generating ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 10 }}>
                    {t("generating")}
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="layers-outline" size={20} color="#FFF" />
                  <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>
                    {t("generate_flashcards")}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Résultat */}
        {result && card && (
          <View>
            {/* Compteur */}
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              justifyContent: "space-between", alignItems: "center", marginBottom: 16,
            }}>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                📚 {result.topic}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#6366F1" }}>
                {isRTL
                  ? `${total} / ${currentCard + 1}`
                  : `${currentCard + 1} / ${total}`}
              </Text>
            </View>

            {/* Carte principale */}
            <TouchableOpacity
              onPress={() => toggleFlip(currentCard)}
              activeOpacity={0.85}
              style={{
                backgroundColor: flipped[currentCard] ? "#6366F1" : "#FFFFFF",
                borderRadius: 20, padding: 32, minHeight: 200,
                alignItems: "center", justifyContent: "center",
                marginBottom: 16, elevation: 4,
                borderWidth: 1,
                borderColor: flipped[currentCard] ? "#6366F1" : "#E5E7EB",
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: "600", marginBottom: 16,
                color: flipped[currentCard] ? "#C7D2FE" : "#9CA3AF",
                textTransform: "uppercase", letterSpacing: 1,
              }}>
                {flipped[currentCard] ? t("answer") : t("question")}
              </Text>
              <Text style={{
                fontSize: 16, fontWeight: "600", textAlign: "center", lineHeight: 24,
                color: flipped[currentCard] ? "#FFFFFF" : "#111827",
                writingDirection: isRTL ? "rtl" : "ltr",
              }}>
                {flipped[currentCard] ? card.answer : card.question}
              </Text>
              <Text style={{
                fontSize: 12, marginTop: 20,
                color: flipped[currentCard] ? "#C7D2FE" : "#9CA3AF",
              }}>
                {t("tap_to_flip")}
              </Text>
            </TouchableOpacity>

            {/* Navigation */}
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              gap: 12, marginBottom: 20,
            }}>
              <TouchableOpacity
                onPress={() => {
                  if (currentCard > 0) {
                    setCurrentCard(currentCard - 1);
                    setFlipped((prev) => ({ ...prev, [currentCard]: false }));
                  }
                }}
                disabled={currentCard === 0}
                style={{
                  flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
                  backgroundColor: currentCard === 0 ? "#F9FAFB" : "#F3F4F6",
                  borderWidth: 1, borderColor: "#E5E7EB",
                }}
              >
                <Text style={{
                  fontWeight: "600", fontSize: 15,
                  color: currentCard === 0 ? "#D1D5DB" : "#374151",
                }}>
                  {t("previous")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (currentCard < total - 1) {
                    setCurrentCard(currentCard + 1);
                    setFlipped((prev) => ({ ...prev, [currentCard]: false }));
                  }
                }}
                disabled={currentCard === total - 1}
                style={{
                  flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
                  backgroundColor: currentCard === total - 1 ? "#F9FAFB" : "#6366F1",
                  borderWidth: 1,
                  borderColor: currentCard === total - 1 ? "#E5E7EB" : "#6366F1",
                }}
              >
                <Text style={{
                  fontWeight: "600", fontSize: 15,
                  color: currentCard === total - 1 ? "#D1D5DB" : "#FFFFFF",
                }}>
                  {t("next_card")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Barre de progression */}
            <View style={{
              height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, marginBottom: 20,
            }}>
              <View style={{
                height: 4, borderRadius: 2, backgroundColor: "#6366F1",
                width: `${((currentCard + 1) / total) * 100}%`,
                alignSelf: isRTL ? "flex-end" : "flex-start",
              }} />
            </View>

            {/* Actions */}
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row", gap: 12,
            }}>
              <TouchableOpacity
                onPress={() => { setResult(null); setSaved(false); setTopic(""); }}
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
      </ScrollView>
    </SafeAreaView>
  );
}