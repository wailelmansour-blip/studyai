// app/solve.tsx
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
import { SolveResult } from "../types/ai";
import { useAiStore } from "../store/aiStore";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../store/languageStore";
import { useAIRequest } from "../hooks/useAIRequest";    // ← AJOUT Phase 14
import { UsageBanner } from "../components/UsageBanner"; // ← AJOUT Phase 14
import { readAICache, writeAICache } from "../store/aiCacheStore"; // ← Phase 15
import { limitInput, getTruncationMessage } from "../utils/inputLimiter"; // ← Phase 15

export default function SolveScreen() {
  const app = getApp();
  const auth = getAuth(app);
  const functions = getFunctions(app, "us-central1");
  const { saveSolution, isLoading } = useAiStore();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const isRTL = currentLanguage === "ar";
  const { checkAndConsume } = useAIRequest(); // ← AJOUT Phase 14

  const [exercise, setExercise] = useState("");
  const [subject, setSubject] = useState("");
  const [result, setResult] = useState<SolveResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);

  const SUBJECTS =
    currentLanguage === "ar"
      ? ["رياضيات", "فيزياء", "كيمياء", "معلوماتية", "أخرى"]
      : currentLanguage === "en"
      ? ["Maths", "Physics", "Chemistry", "CS", "Other"]
      : ["Maths", "Physique", "Chimie", "Info", "Autre"];

  const handleSolve = async () => {
  if (exercise.trim().length < 5) {
    Alert.alert(t("error"), "Saisis l'exercice à résoudre.");
    return;
  }

  const allowed = await checkAndConsume();
  if (!allowed) return;

  // Phase 15 — limiter input
  const { text: limitedExercise, wasTruncated } = limitInput(exercise, "solve");
  if (wasTruncated) {
    Alert.alert("ℹ️", getTruncationMessage(currentLanguage, 1500));
  }

  // Phase 15 — vérifier cache
  const cacheInput = { exercise: limitedExercise, subject, language: currentLanguage };
  const cached = await readAICache("solve", cacheInput);
  if (cached) {
    setResult({
      userId: auth.currentUser?.uid || "anonymous",
      exercise,
      solution: cached.solution || "",
      steps: cached.steps || [],
      subject: cached.subject || subject || "Général",
      createdAt: new Date().toISOString(),
    });
    return;
  }

  setGenerating(true);
  setResult(null);
  setSaved(false);
  try {
    const fn = httpsCallable(functions, "solveExercise");
    const res = await fn({ exercise: limitedExercise, subject, language: currentLanguage });
    const data = res.data as any;
    setResult({
      userId: auth.currentUser?.uid || "anonymous",
      exercise,
      solution: data.solution || "",
      steps: data.steps || [],
      subject: data.subject || subject || "Général",
      createdAt: new Date().toISOString(),
    });
    // Phase 15 — sauvegarder cache
    await writeAICache("solve", cacheInput, data);
  } catch (e: any) {
    Alert.alert(t("error"), e.message || "La résolution a échoué.");
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
    await saveSolution(result);
    setSaved(true);
    Alert.alert("✅", t("saved"));
  } catch (e: any) {
    console.error("Erreur sauvegarde solution:", e);
    Alert.alert(
      t("error"),
      currentLanguage === "ar"
        ? `فشل الحفظ.\n\n${e?.message || e?.code || "خطأ غير معروف"}`
        : currentLanguage === "en"
        ? `Save failed.\n\n${e?.message || e?.code || "Unknown error"}`
        : `La sauvegarde a échoué.\n\n${e?.message || e?.code || "Erreur inconnue"}`
    );

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
              {t("solve_title_screen")}
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
              {t("generated_by")}
            </Text>
          </View>
        </View>

        {/* ── Phase 14 : Bandeau usage ── */}
        <UsageBanner isRTL={isRTL} />

        {/* Matière */}
        <Text style={{
          fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 10,
          textAlign: isRTL ? "right" : "left",
        }}>
          📚 {t("solve_title_screen").includes("Solve") ? "Subject" : currentLanguage === "ar" ? "المادة" : "Matière"}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
        >
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8 }}>
            {SUBJECTS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSubject(s === subject ? "" : s)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: subject === s ? "#6366F1" : "#FFFFFF",
                  borderWidth: 1, borderColor: subject === s ? "#6366F1" : "#E5E7EB",
                }}
              >
                <Text style={{
                  fontSize: 14, fontWeight: "500",
                  color: subject === s ? "#FFFFFF" : "#374151",
                }}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Exercice */}
        <Text style={{
          fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 8,
          textAlign: isRTL ? "right" : "left",
        }}>
          ✏️ {t("exercise_input")}
        </Text>
        <TextInput
          value={exercise}
          onChangeText={setExercise}
          placeholder={t("exercise_input") + "..."}
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={6}
          textAlign={isRTL ? "right" : "left"}
          style={{
            backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
            borderRadius: 12, padding: 14, fontSize: 14, color: "#111827",
            minHeight: 140, textAlignVertical: "top", marginBottom: 24,
            writingDirection: isRTL ? "rtl" : "ltr",
          }}
        />

        {/* Bouton */}
        <TouchableOpacity
          onPress={handleSolve}
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
                {t("solving")}
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="calculator-outline" size={20} color="#FFF" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>
                {t("solve_btn")}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Résultat */}
        {result && (
          <View>
            {/* Matière détectée */}
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center", marginBottom: 14,
            }}>
              <View style={{
                backgroundColor: "#EEF2FF", borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 6,
              }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#6366F1" }}>
                  📚 {result.subject}
                </Text>
              </View>
            </View>

            {/* Étapes */}
            {result.steps.length > 0 && (
              <View style={{
                backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16,
                marginBottom: 14, borderWidth: 1, borderColor: "#E5E7EB",
              }}>
                <Text style={{
                  fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 12,
                  textAlign: isRTL ? "right" : "left",
                }}>
                  🪜 {t("steps")}
                </Text>
                {result.steps.map((step, i) => (
                  <View key={i} style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "flex-start", marginBottom: 10, paddingBottom: 10,
                    borderBottomWidth: i < result.steps.length - 1 ? 1 : 0,
                    borderBottomColor: "#F3F4F6",
                  }}>
                    <View style={{
                      width: 24, height: 24, borderRadius: 12, backgroundColor: "#6366F1",
                      alignItems: "center", justifyContent: "center",
                      marginRight: isRTL ? 0 : 10,
                      marginLeft: isRTL ? 10 : 0,
                      flexShrink: 0,
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFF" }}>
                        {i + 1}
                      </Text>
                    </View>
                    <Text style={{
                      fontSize: 13, color: "#374151", flex: 1, lineHeight: 20,
                      textAlign: isRTL ? "right" : "left",
                      writingDirection: isRTL ? "rtl" : "ltr",
                    }}>
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Solution finale */}
            <View style={{
              backgroundColor: "#F0FDF4", borderRadius: 14, padding: 16,
              marginBottom: 16,
              borderLeftWidth: isRTL ? 0 : 4,
              borderRightWidth: isRTL ? 4 : 0,
              borderLeftColor: "#10B981",
              borderRightColor: "#10B981",
            }}>
              <Text style={{
                fontSize: 14, fontWeight: "700", color: "#065F46", marginBottom: 8,
                textAlign: isRTL ? "right" : "left",
              }}>
                ✅ {t("final_solution")}
              </Text>
              <Text style={{
                fontSize: 14, color: "#065F46", lineHeight: 22,
                textAlign: isRTL ? "right" : "left",
                writingDirection: isRTL ? "rtl" : "ltr",
              }}>
                {result.solution}
              </Text>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => { setResult(null); setSaved(false); setExercise(""); }}
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