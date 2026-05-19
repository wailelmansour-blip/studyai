// app/(tabs)/study.tsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../../store/languageStore";
import { useThemeStore } from "../../store/themeStore";
import { Colors } from "../../constants/colors";

interface StudyItem {
  emoji: string;
  titleKey: string;
  subtitleKey: string;
  route: string;
  colorLight: string;
  bgLight: string;
  colorDark: string;
  bgDark: string;
}

const STUDY_ITEMS: StudyItem[] = [
  { emoji: "📋", titleKey: "summary_screen_title", subtitleKey: "summary_desc", route: "/summary", colorLight: "#6366F1", bgLight: "#EEF2FF", colorDark: "#818CF8", bgDark: "#1E1B4B" },
  { emoji: "💡", titleKey: "explain_title_screen", subtitleKey: "explain_desc", route: "/explain", colorLight: "#F59E0B", bgLight: "#FFFBEB", colorDark: "#FCD34D", bgDark: "#2D1B00" },
  { emoji: "🧮", titleKey: "solve_title_screen", subtitleKey: "solve_desc", route: "/solve", colorLight: "#10B981", bgLight: "#F0FDF4", colorDark: "#34D399", bgDark: "#022C22" },
  { emoji: "🃏", titleKey: "flashcards_title_screen", subtitleKey: "flashcards_desc", route: "/flashcards", colorLight: "#3B82F6", bgLight: "#EFF6FF", colorDark: "#60A5FA", bgDark: "#1E3A5F" },
  { emoji: "❓", titleKey: "quiz_screen_title", subtitleKey: "quiz_desc", route: "/quiz", colorLight: "#EC4899", bgLight: "#FDF2F8", colorDark: "#F472B6", bgDark: "#2D0A1E" },
  { emoji: "📅", titleKey: "plan_screen_title", subtitleKey: "plan_desc", route: "/plan", colorLight: "#14B8A6", bgLight: "#F0FDFA", colorDark: "#2DD4BF", bgDark: "#022C26" },
];

export default function StudyScreen() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const { isDark } = useThemeStore();
  const C = isDark ? Colors.dark : Colors.light;
  const isRTL = currentLanguage === "ar";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{
            fontSize: 28, fontWeight: "800", color: C.text,
            textAlign: isRTL ? "right" : "left",
          }}>
            {currentLanguage === "ar" ? "📚 أدوات الدراسة"
              : currentLanguage === "en" ? "📚 Study Tools"
              : "📚 Outils d'étude"}
          </Text>
          <Text style={{
            fontSize: 15, color: C.textSecondary, marginTop: 6,
            textAlign: isRTL ? "right" : "left",
          }}>
            {currentLanguage === "ar" ? "اختر الأداة المناسبة لك"
              : currentLanguage === "en" ? "Choose the right tool for you"
              : "Choisis l'outil adapté à tes besoins"}
          </Text>
        </View>

        {/* List */}
        {STUDY_ITEMS.map((item) => {
          const color = isDark ? item.colorDark : item.colorLight;
          const bg = isDark ? item.bgDark : item.bgLight;

          return (
            <TouchableOpacity
              key={item.route}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.85}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                backgroundColor: C.card,
                borderRadius: 18, padding: 18,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: C.border,
                elevation: 2,
                shadowColor: isDark ? "#000" : "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.3 : 0.06,
                shadowRadius: 8,
              }}
            >
              {/* Icon */}
              <View style={{
                width: 52, height: 52, borderRadius: 16,
                backgroundColor: bg,
                alignItems: "center", justifyContent: "center",
                marginRight: isRTL ? 0 : 16,
                marginLeft: isRTL ? 16 : 0,
              }}>
                <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
              </View>

              {/* Text */}
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16, fontWeight: "700", color: C.text,
                  textAlign: isRTL ? "right" : "left",
                }}>
                  {t(item.titleKey)}
                </Text>
                <Text style={{
                  fontSize: 13, color: C.textSecondary, marginTop: 3,
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
                backgroundColor: bg,
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons
                  name={isRTL ? "chevron-back" : "chevron-forward"}
                  size={16} color={color}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}