// app/(tabs)/study.tsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../../store/languageStore";

export default function StudyScreen() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const isRTL = currentLanguage === "ar";

  const STUDY_TOOLS = [
    { title: t("summary_title"),    sub: t("summary_sub"),    icon: "document-text-outline" as const, color: "#6366F1", bg: "#EEF2FF", route: "/summary" },
    { title: t("explain_title"),    sub: t("explain_sub"),    icon: "bulb-outline" as const,          color: "#8B5CF6", bg: "#F5F3FF", route: "/explain" },
    { title: t("solve_title"),      sub: t("solve_sub"),      icon: "calculator-outline" as const,    color: "#EF4444", bg: "#FEF2F2", route: "/solve" },
    { title: t("flashcards_title"), sub: t("flashcards_sub"), icon: "layers-outline" as const,        color: "#06B6D4", bg: "#ECFEFF", route: "/flashcards" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={{
          fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 6,
          textAlign: isRTL ? "right" : "left",
        }}>
          {t("study")}
        </Text>
        <Text style={{
          fontSize: 14, color: "#6B7280", marginBottom: 24,
          textAlign: isRTL ? "right" : "left",
        }}>
          {t("ai_tools")}
        </Text>

        {STUDY_TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.route}
            onPress={() => router.push(tool.route as any)}
            style={{
              backgroundColor: "#FFFFFF", borderRadius: 14, padding: 18,
              flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center",
              borderWidth: 1, borderColor: "#F3F4F6", marginBottom: 12, elevation: 2,
            }}
          >
            <View style={{
              width: 48, height: 48, borderRadius: 14, backgroundColor: tool.bg,
              alignItems: "center", justifyContent: "center",
              marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0,
            }}>
              <Ionicons name={tool.icon} size={24} color={tool.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 15, fontWeight: "700", color: "#111827",
                textAlign: isRTL ? "right" : "left",
              }}>
                {tool.title}
              </Text>
              <Text style={{
                fontSize: 13, color: "#6B7280", marginTop: 2,
                textAlign: isRTL ? "right" : "left",
              }}>
                {tool.sub}
              </Text>
            </View>
            <Ionicons
              name={isRTL ? "chevron-back" : "chevron-forward"}
              size={20} color="#9CA3AF"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}