// app/(tabs)/study.tsx
import React from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../../store/languageStore";
import { LinearGradient } from "expo-linear-gradient";

interface StudyItem {
  emoji: string;
  titleKey: string;
  subtitleKey: string;
  route: string;
  color: string;
  bg: string;
}

const STUDY_ITEMS: StudyItem[] = [
  { emoji: "📋", titleKey: "summary_screen_title", subtitleKey: "summary_desc", route: "/summary", color: "#6366F1", bg: "#EEF2FF" },
  { emoji: "💡", titleKey: "explain_title_screen", subtitleKey: "explain_desc", route: "/explain", color: "#F59E0B", bg: "#FFFBEB" },
  { emoji: "🧮", titleKey: "solve_title_screen", subtitleKey: "solve_desc", route: "/solve", color: "#10B981", bg: "#F0FDF4" },
  { emoji: "🃏", titleKey: "flashcards_title_screen", subtitleKey: "flashcards_desc", route: "/flashcards", color: "#3B82F6", bg: "#EFF6FF" },
  { emoji: "❓", titleKey: "quiz_screen_title", subtitleKey: "quiz_desc", route: "/quiz", color: "#EC4899", bg: "#FDF2F8" },
  { emoji: "📅", titleKey: "plan_screen_title", subtitleKey: "plan_desc", route: "/plan", color: "#14B8A6", bg: "#F0FDFA" },
];

export default function StudyScreen() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const isRTL = currentLanguage === "ar";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{
            fontSize: 28, fontWeight: "800", color: "#111827",
            textAlign: isRTL ? "right" : "left",
          }}>
            {currentLanguage === "ar" ? "📚 أدوات الدراسة"
              : currentLanguage === "en" ? "📚 Study Tools"
              : "📚 Outils d'étude"}
          </Text>
          <Text style={{
            fontSize: 15, color: "#6B7280", marginTop: 6,
            textAlign: isRTL ? "right" : "left",
          }}>
            {currentLanguage === "ar" ? "اختر الأداة المناسبة لك"
              : currentLanguage === "en" ? "Choose the right tool for you"
              : "Choisis l'outil adapté à tes besoins"}
          </Text>
        </View>

        {/* List */}
        {STUDY_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.route}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.85}
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: 18, padding: 18,
              marginBottom: 12,
              elevation: 2,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            }}
          >
            {/* Icon */}
            <View style={{
              width: 52, height: 52, borderRadius: 16,
              backgroundColor: item.bg,
              alignItems: "center", justifyContent: "center",
              marginRight: isRTL ? 0 : 16,
              marginLeft: isRTL ? 16 : 0,
            }}>
              <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
            </View>

            {/* Text */}
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 16, fontWeight: "700", color: "#111827",
                textAlign: isRTL ? "right" : "left",
              }}>
                {t(item.titleKey)}
              </Text>
              <Text style={{
                fontSize: 13, color: "#6B7280", marginTop: 3,
                textAlign: isRTL ? "right" : "left",
              }}>
                {currentLanguage === "ar" ? "اضغط للبدء"
                  : currentLanguage === "en" ? "Tap to start"
                  : "Appuie pour commencer"}
              </Text>
            </View>

            {/* Arrow */}
            <View style={{
              width: 32, height: 32, borderRadius: 10,
              backgroundColor: item.bg,
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons
                name={isRTL ? "chevron-back" : "chevron-forward"}
                size={16} color={item.color}
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}