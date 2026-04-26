// app/summary.tsx
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, addDoc, Timestamp, getFirestore } from "firebase/firestore";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../store/languageStore";

export default function SummaryScreen() {
  const app = getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, "us-central1");
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();

  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSummarize = async () => {
    if (inputText.trim().length < 20) {
      Alert.alert(t("error"), "Saisis au moins 20 caractères à résumer.");
      return;
    }
    setIsLoading(true);
    setSummary("");
    setIsSaved(false);
    try {
      const fn = httpsCallable(functions, "summarize");
      const res = await fn({ text: inputText, language: currentLanguage });
      const data = res.data as any;
      setSummary(data.summary || "");
    } catch (e: any) {
      Alert.alert(t("error"), e.message || "La génération a échoué.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!summary) return;
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "summaries"), {
        userId: user?.uid || "anonymous",
        originalText: inputText,
        summary,
        language: currentLanguage,
        createdAt: Timestamp.now(),
      });
      setIsSaved(true);
      Alert.alert("✅", t("saved"));
    } catch {
      Alert.alert(t("error"), "La sauvegarde a échoué.");
    }
  };

  const isRTL = currentLanguage === "ar";

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
              {t("summary_screen_title")}
            </Text>
            <Text style={{
              fontSize: 13, color: "#6B7280", marginTop: 2,
              textAlign: isRTL ? "right" : "left",
            }}>
              {t("generated_by")}
            </Text>
          </View>
        </View>

        {/* Input label */}
        <Text style={{
          fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 8,
          textAlign: isRTL ? "right" : "left",
        }}>
          📝 {t("text_to_summarize")}
        </Text>

        {/* Input */}
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder={t("text_to_summarize") + "..."}
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={8}
          textAlign={isRTL ? "right" : "left"}
          style={{
            backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E7EB",
            borderRadius: 12, padding: 14, fontSize: 14, color: "#111827",
            minHeight: 160, textAlignVertical: "top", marginBottom: 20,
            writingDirection: isRTL ? "rtl" : "ltr",
          }}
        />

        {/* Bouton Résumer */}
        <TouchableOpacity
          onPress={handleSummarize}
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? "#A5B4FC" : "#6366F1",
            borderRadius: 14, padding: 16, alignItems: "center",
            elevation: 4, marginBottom: 24,
          }}
        >
          {isLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 10 }}>
                {t("summarizing")}
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="sparkles" size={20} color="#FFF" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>
                {t("summarize_btn")}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Résultat */}
        {summary !== "" && (
          <View>
            <View style={{
              backgroundColor: "#EEF2FF", borderRadius: 14, padding: 16,
              marginBottom: 16,
              borderLeftWidth: isRTL ? 0 : 4,
              borderRightWidth: isRTL ? 4 : 0,
              borderLeftColor: "#6366F1",
              borderRightColor: "#6366F1",
            }}>
              <Text style={{
                fontSize: 14, fontWeight: "700", color: "#3730A3", marginBottom: 8,
                textAlign: isRTL ? "right" : "left",
              }}>
                📋 {t("summary_result")}
              </Text>
              <Text style={{
                fontSize: 14, color: "#3730A3", lineHeight: 22,
                textAlign: isRTL ? "right" : "left",
                writingDirection: isRTL ? "rtl" : "ltr",
              }}>
                {summary}
              </Text>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => { setSummary(""); setInputText(""); setIsSaved(false); }}
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
                disabled={isSaved}
                style={{
                  flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
                  backgroundColor: isSaved ? "#10B981" : "#6366F1",
                }}
              >
                <Text style={{ fontWeight: "600", color: "#FFF", fontSize: 15 }}>
                  {isSaved ? `✅ ${t("saved")}` : `💾 ${t("save")}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}