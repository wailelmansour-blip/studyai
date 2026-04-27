// app/plan.tsx
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { usePlanStore } from "../store/planStore";
import { StudyPlan, StudySession, GeneratePlanInput } from "../types/plan";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../store/languageStore";
import { useAIRequest } from "../hooks/useAIRequest";    // ← AJOUT Phase 14
import { UsageBanner } from "../components/UsageBanner"; // ← AJOUT Phase 14
import { readAICache, writeAICache } from "../store/aiCacheStore"; // ← Phase 15
import { limitInput } from "../utils/inputLimiter";                // ← Phase 15

export default function PlanScreen() {
  const app = getApp();
  const auth = getAuth(app);
  const functions = getFunctions(app, "us-central1");
  const { savePlan, isLoading } = usePlanStore();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const isRTL = currentLanguage === "ar";
  const { checkAndConsume } = useAIRequest(); // ← AJOUT Phase 14

  const [subjects, setSubjects] = useState<string[]>([""]);
  const [examDate, setExamDate] = useState<Date>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hoursPerDay, setHoursPerDay] = useState("2");
  const [generatedPlan, setGeneratedPlan] = useState<StudyPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);

  const addSubject = () => {
    if (subjects.length < 8) setSubjects([...subjects, ""]);
  };

  const removeSubject = (index: number) => {
    if (subjects.length === 1) return;
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const updateSubject = (index: number, value: string) => {
    const updated = [...subjects];
    updated[index] = value;
    setSubjects(updated);
  };

  const formatDate = (date: Date) => {
    const locale =
      currentLanguage === "ar" ? "ar-SA"
      : currentLanguage === "en" ? "en-GB"
      : "fr-FR";
    return date.toLocaleDateString(locale, {
      weekday: "long", day: "numeric",
      month: "long", year: "numeric",
    });
  };

  const daysUntilExam = () => {
    const diff = examDate.getTime() - Date.now();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleGenerate = async () => {
  const validSubjects = subjects.filter((s) => s.trim().length > 0);
  if (validSubjects.length === 0) {
    Alert.alert(t("error"), "Ajoute au moins une matière.");
    return;
  }
  const hours = parseFloat(hoursPerDay);
  if (isNaN(hours) || hours < 0.5 || hours > 12) {
    Alert.alert(t("error"), "Heures par jour : entre 0.5 et 12.");
    return;
  }

  const allowed = await checkAndConsume();
  if (!allowed) return;

  // Phase 15 — limiter chaque matière à 100 caractères
  const limitedSubjects = validSubjects.map(
    (s) => limitInput(s, "plan").text
  );

  // Phase 15 — vérifier cache
  const cacheInput = {
    subjects: limitedSubjects,
    examDate: examDate.toISOString().split("T")[0], // juste la date YYYY-MM-DD
    hoursPerDay: hours,
    language: currentLanguage,
  };
  const cached = await readAICache("plan", cacheInput);
  if (cached) {
    const sessions: StudySession[] = [];
    const schedule = cached.schedule || {};
    Object.entries(schedule).forEach(([day, items]: [string, any]) => {
      if (!items || items.length === 0) return;
      items.forEach((item: any) => {
        sessions.push({
          day,
          subject: item.subject || "",
          duration: parseInt(item.duration) || 60,
          tasks: item.task ? [item.task] : [],
          completed: false,
        });
      });
    });
    setGeneratedPlan({
      userId: auth.currentUser?.uid || "anonymous",
      subjects: limitedSubjects,
      examDate: examDate.toISOString(),
      totalDays: daysUntilExam(),
      sessions,
      title: cached.plan || `Plan — ${limitedSubjects.join(", ")}`,
      createdAt: new Date().toISOString(),
      tips: cached.tips || [],
    });
    return;
  }

  setGenerating(true);
  setGeneratedPlan(null);
  setSaved(false);
  try {
    const generatePlanFn = httpsCallable(functions, "generatePlan");
    const input: GeneratePlanInput = {
      subjects: limitedSubjects,
      examDate: examDate.toISOString(),
      hoursPerDay: hours,
    };
    const result = await generatePlanFn({ ...input, language: currentLanguage });
    const data = result.data as any;

    const sessions: StudySession[] = [];
    const schedule = data.schedule || {};
    Object.entries(schedule).forEach(([day, items]: [string, any]) => {
      if (!items || items.length === 0) return;
      items.forEach((item: any) => {
        sessions.push({
          day,
          subject: item.subject || "",
          duration: parseInt(item.duration) || 60,
          tasks: item.task ? [item.task] : [],
          completed: false,
        });
      });
    });

    const plan: StudyPlan = {
      userId: auth.currentUser?.uid || "anonymous",
      subjects: limitedSubjects,
      examDate: examDate.toISOString(),
      totalDays: daysUntilExam(),
      sessions,
      title: data.plan || `Plan — ${limitedSubjects.join(", ")}`,
      createdAt: new Date().toISOString(),
      tips: data.tips || [],
    };
    setGeneratedPlan(plan);

    // Phase 15 — sauvegarder cache
    await writeAICache("plan", cacheInput, data);
  } catch (error: any) {
    Alert.alert(t("error"), error.message || "La génération a échoué.");
  } finally {
    setGenerating(false);
  }
};

  const handleSave = async () => {
    if (!generatedPlan) return;
    try {
      await savePlan(generatedPlan);
      setSaved(true);
      Alert.alert("✅", t("saved"));
    } catch {
      Alert.alert(t("error"), "La sauvegarde a échoué.");
    }
  };

  const handleReset = () => {
    setGeneratedPlan(null);
    setSaved(false);
    setSubjects([""]);
    setExamDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setHoursPerDay("2");
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
              {t("plan_screen_title")}
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
              {t("generated_by")}
            </Text>
          </View>
        </View>

        {/* ── Phase 14 : Bandeau usage ── */}
        <UsageBanner isRTL={isRTL} />

        {/* Form */}
        {!generatedPlan && (
          <View>
            {/* Matières */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 10,
                textAlign: isRTL ? "right" : "left",
              }}>
                📚 {t("subjects")}
              </Text>
              {subjects.map((subject, index) => (
                <View key={index} style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center", marginBottom: 8,
                }}>
                  <TextInput
                    value={subject}
                    onChangeText={(v) => updateSubject(index, v)}
                    placeholder={`${currentLanguage === "ar" ? "مادة" : currentLanguage === "en" ? "Subject" : "Matière"} ${index + 1}`}
                    placeholderTextColor="#9CA3AF"
                    textAlign={isRTL ? "right" : "left"}
                    style={{
                      flex: 1, backgroundColor: "#FFFFFF", borderWidth: 1,
                      borderColor: "#E5E7EB", borderRadius: 10, padding: 12,
                      fontSize: 15, color: "#111827",
                      writingDirection: isRTL ? "rtl" : "ltr",
                    }}
                  />
                  {subjects.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeSubject(index)}
                      style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0, padding: 8 }}
                    >
                      <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {subjects.length < 8 && (
                <TouchableOpacity
                  onPress={addSubject}
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center", marginTop: 4,
                    alignSelf: isRTL ? "flex-end" : "flex-start",
                  }}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#6366F1" />
                  <Text style={{
                    color: "#6366F1", marginLeft: isRTL ? 0 : 6,
                    marginRight: isRTL ? 6 : 0, fontSize: 14, fontWeight: "500",
                  }}>
                    {t("add_subject")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Date d'examen */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 10,
                textAlign: isRTL ? "right" : "left",
              }}>
                📅 {t("exam_date")}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={{
                  backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
                  borderRadius: 10, padding: 14,
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center", justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 15, color: "#111827" }}>
                  {formatDate(examDate)}
                </Text>
                <View style={{
                  backgroundColor: "#EEF2FF", borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 4,
                }}>
                  <Text style={{ color: "#6366F1", fontSize: 13, fontWeight: "600" }}>
                    {isRTL ? `${daysUntilExam()}-ي` : `J-${daysUntilExam()}`}
                  </Text>
                </View>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={examDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minimumDate={new Date()}
                  onChange={(_, date) => {
                    setShowDatePicker(false);
                    if (date) setExamDate(date);
                  }}
                />
              )}
            </View>

            {/* Heures par jour */}
            <View style={{ marginBottom: 28 }}>
              <Text style={{
                fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 10,
                textAlign: isRTL ? "right" : "left",
              }}>
                ⏱ {t("hours_per_day")}
              </Text>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
                {["1", "2", "3", "4", "6"].map((h) => (
                  <TouchableOpacity
                    key={h}
                    onPress={() => setHoursPerDay(h)}
                    style={{
                      flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
                      backgroundColor: hoursPerDay === h ? "#6366F1" : "#FFFFFF",
                      borderWidth: 1, borderColor: hoursPerDay === h ? "#6366F1" : "#E5E7EB",
                    }}
                  >
                    <Text style={{
                      fontWeight: "600", fontSize: 15,
                      color: hoursPerDay === h ? "#FFFFFF" : "#374151",
                    }}>
                      {h}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Bouton Générer */}
            <TouchableOpacity
              onPress={handleGenerate}
              disabled={generating}
              style={{
                backgroundColor: generating ? "#A5B4FC" : "#6366F1",
                borderRadius: 14, padding: 16, alignItems: "center",
                elevation: 4,
              }}
            >
              {generating ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16, marginLeft: 10 }}>
                    {t("generating_plan")}
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>
                    {t("generate_plan")}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Résultat */}
        {generatedPlan && (
          <View>
            {/* Résumé */}
            <View style={{
              backgroundColor: "#EEF2FF", borderRadius: 14, padding: 16, marginBottom: 20,
            }}>
              <Text style={{
                fontSize: 17, fontWeight: "700", color: "#3730A3", marginBottom: 6,
                textAlign: isRTL ? "right" : "left",
              }}>
                🎯 {generatedPlan.title}
              </Text>
              <Text style={{
                fontSize: 13, color: "#4338CA",
                textAlign: isRTL ? "right" : "left",
              }}>
                {generatedPlan.totalDays} {currentLanguage === "ar" ? "يوم" : currentLanguage === "en" ? "days" : "jours"} ·{" "}
                {generatedPlan.subjects.length} {currentLanguage === "ar" ? "مادة" : currentLanguage === "en" ? "subjects" : "matières"} ·{" "}
                {formatDate(examDate)}
              </Text>
            </View>

            {/* Sessions */}
            {generatedPlan.sessions.map((session: StudySession, index: number) => (
              <View key={index} style={{
                backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14,
                marginBottom: 12,
                borderLeftWidth: isRTL ? 0 : 4,
                borderRightWidth: isRTL ? 4 : 0,
                borderLeftColor: "#6366F1",
                borderRightColor: "#6366F1",
                elevation: 2,
              }}>
                <View style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  justifyContent: "space-between", alignItems: "center", marginBottom: 8,
                }}>
                  <Text style={{
                    fontSize: 14, fontWeight: "700", color: "#111827", flex: 1,
                    textAlign: isRTL ? "right" : "left",
                  }}>
                    {session.day}
                  </Text>
                  <View style={{
                    backgroundColor: "#EEF2FF", borderRadius: 8,
                    paddingHorizontal: 8, paddingVertical: 3,
                  }}>
                    <Text style={{ fontSize: 12, color: "#6366F1", fontWeight: "600" }}>
                      {session.duration} min
                    </Text>
                  </View>
                </View>
                <Text style={{
                  fontSize: 13, color: "#6366F1", fontWeight: "600", marginBottom: 6,
                  textAlign: isRTL ? "right" : "left",
                }}>
                  📖 {session.subject}
                </Text>
                {session.tasks?.map((task: string, ti: number) => (
                  <View key={ti} style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "flex-start", marginTop: 4,
                  }}>
                    <Text style={{
                      color: "#9CA3AF",
                      marginRight: isRTL ? 0 : 6,
                      marginLeft: isRTL ? 6 : 0,
                      marginTop: 1,
                    }}>•</Text>
                    <Text style={{
                      fontSize: 13, color: "#374151", flex: 1,
                      textAlign: isRTL ? "right" : "left",
                    }}>
                      {task}
                    </Text>
                  </View>
                ))}
              </View>
            ))}

            {/* Tips IA */}
            {generatedPlan.tips && generatedPlan.tips.length > 0 && (
              <View style={{
                backgroundColor: "#F0FDF4", borderRadius: 12, padding: 14,
                marginBottom: 12,
                borderLeftWidth: isRTL ? 0 : 4,
                borderRightWidth: isRTL ? 4 : 0,
                borderLeftColor: "#10B981",
                borderRightColor: "#10B981",
              }}>
                <Text style={{
                  fontSize: 14, fontWeight: "700", color: "#065F46", marginBottom: 8,
                  textAlign: isRTL ? "right" : "left",
                }}>
                  💡 {t("ai_tips")}
                </Text>
                {generatedPlan.tips.map((tip: string, i: number) => (
                  <View key={i} style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "flex-start", marginTop: i > 0 ? 6 : 0,
                  }}>
                    <Text style={{
                      color: "#10B981",
                      marginRight: isRTL ? 0 : 6,
                      marginLeft: isRTL ? 6 : 0,
                      marginTop: 1,
                    }}>•</Text>
                    <Text style={{
                      fontSize: 13, color: "#065F46", flex: 1,
                      textAlign: isRTL ? "right" : "left",
                    }}>
                      {tip}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Actions */}
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              gap: 12, marginTop: 8,
            }}>
              <TouchableOpacity
                onPress={handleReset}
                style={{
                  flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
                  backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
                }}
              >
                <Text style={{ fontWeight: "600", color: "#374151", fontSize: 15 }}>
                  🔄 {t("new_plan")}
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
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ fontWeight: "600", color: "#FFFFFF", fontSize: 15 }}>
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