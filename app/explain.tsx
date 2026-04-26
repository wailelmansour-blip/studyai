// app/explain.tsx
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
import { ExplainResult } from "../types/ai";
import { useAiStore } from "../store/aiStore";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../store/languageStore";
import { useAIRequest } from "../hooks/useAIRequest";    // ← AJOUT Phase 14
import { UsageBanner } from "../components/UsageBanner"; // ← AJOUT Phase 14

export default function ExplainScreen() {
  const app = getApp();
  const auth = getAuth(app);
  const functions = getFunctions(app, "us-central1");
  const { saveExplanation, isLoading } = useAiStore();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const isRTL = currentLanguage === "ar";
  const { checkAndConsume } = useAIRequest(); // ← AJOUT Phase 14

  const [text, setText] = useState("");
  const [difficulty, setDifficulty] = useState<"facile" | "moyen" | "difficile">("moyen");
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);

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

    const allowed = await checkAndConsume(); // ← AJOUT Phase 14
    if (!allowed) return;                    // ← AJOUT Phase 14

    setGenerating(true);
    setResult(null);
    setSaved(false);
    try {
      const fn = httpsCallable(functions, "explainText");
      const res = await fn({ text, difficulty, language: currentLanguage });
      const data = res.data as any;
      setResult({
        userId: auth.currentUser?.uid || "anonymous",
        inputText: text,
        explanation: data.explanation || "",
        keyPoints: data.keyPoints || [],
        difficulty: data.difficulty || difficulty,
        createdAt: new Date().toISOString(),
      });
    } catch (e: any) {
      Alert.alert(t("error"), e.message || "La génération a échoué.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await saveExplanation(result);
      setSaved(true);
      Alert.alert("✅", t("saved"));
    } catch {
      Alert.alert(t("error"), "La sauvegarde a échoué.");
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

        {/* ── Phase 14 : Bandeau usage ── */}
        <UsageBanner isRTL={isRTL} />

        {/* Input */}
        <Text style={{
          fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 8,
          textAlign: isRTL ? "right" : "left",
        }}>
          📝 {t("text_to_explain")}
        </Text>
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
            {/* Explication */}
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

            {/* Points clés */}
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

            {/* Badge difficulté */}
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

            {/* Actions */}
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
      </ScrollView>
    </SafeAreaView>
  );
}