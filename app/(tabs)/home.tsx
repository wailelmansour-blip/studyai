// app/(tabs)/home.tsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../../store/languageStore";

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const isRTL = currentLanguage === "ar";
  const displayName = user?.email?.split("@")[0] || "Étudiant";

  const FEATURES = [
    { title: t("summary_title"), subtitle: t("summary_sub"),    icon: "document-text-outline" as const, color: "#6366F1", bg: "#EEF2FF", route: "/summary" },
    { title: t("quiz_title"),    subtitle: t("quiz_sub"),        icon: "help-circle-outline" as const,   color: "#F59E0B", bg: "#FFFBEB", route: "/(tabs)/quiz" },
    { title: t("plan_title"),    subtitle: t("plan_sub"),        icon: "calendar-outline" as const,      color: "#10B981", bg: "#F0FDF4", route: "/plan" },
    { title: t("explain_title"), subtitle: t("explain_sub"),    icon: "bulb-outline" as const,          color: "#8B5CF6", bg: "#F5F3FF", route: "/explain" },
    { title: t("solve_title"),   subtitle: t("solve_sub"),      icon: "calculator-outline" as const,    color: "#EF4444", bg: "#FEF2F2", route: "/solve" },
    { title: t("flashcards_title"), subtitle: t("flashcards_sub"), icon: "layers-outline" as const,     color: "#06B6D4", bg: "#ECFEFF", route: "/flashcards" },
    { title: t("chat_title"),    subtitle: t("chat_sub"),        icon: "chatbubbles-outline" as const,   color: "#F59E0B", bg: "#FFFBEB", route: "/chat" },
  ];

  const QUICK_ACCESS = [
    { route: "/summary",    icon: "add-outline" as const,     bg: "#EEF2FF", color: "#6366F1", title: t("summary_title"),    sub: t("summary_sub") },
    { route: "/plan",       icon: "calendar-outline" as const, bg: "#F0FDF4", color: "#10B981", title: t("plan_title"),       sub: t("plan_sub") },
    { route: "/flashcards", icon: "layers-outline" as const,   bg: "#ECFEFF", color: "#06B6D4", title: t("flashcards_title"), sub: t("flashcards_sub") },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        {/* Header */}
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          justifyContent: "space-between", alignItems: "center", marginBottom: 24,
        }}>
          <View>
            <Text style={{ fontSize: 13, color: "#6B7280", textAlign: isRTL ? "right" : "left" }}>
              {t("hello")} 👋
            </Text>
            <Text style={{
              fontSize: 22, fontWeight: "700", color: "#111827",
              marginTop: 2, textAlign: isRTL ? "right" : "left",
            }}>
              {displayName}
            </Text>
          </View>
          <View style={{
            width: 42, height: 42, borderRadius: 21,
            backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#6366F1" }}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Banner */}
        <View style={{
          backgroundColor: "#6366F1", borderRadius: 16, padding: 20, marginBottom: 28,
        }}>
          <Text style={{
            fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 4,
            textAlign: isRTL ? "right" : "left",
          }}>
            StudyAI 🎓
          </Text>
          <Text style={{
            fontSize: 13, color: "#C7D2FE", lineHeight: 20,
            textAlign: isRTL ? "right" : "left",
          }}>
            {t("studyai_desc")}
          </Text>
        </View>

        {/* Features Grid */}
        <Text style={{
          fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 14,
          textAlign: isRTL ? "right" : "left",
        }}>
          {t("ai_tools")}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
          {FEATURES.map((f) => (
            <TouchableOpacity
              key={f.route}
              onPress={() => router.push(f.route as any)}
              style={{
                width: "47%", backgroundColor: "#FFFFFF", borderRadius: 14,
                padding: 16, borderWidth: 1, borderColor: "#F3F4F6", elevation: 2,
              }}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 12, backgroundColor: f.bg,
                alignItems: "center", justifyContent: "center", marginBottom: 10,
                alignSelf: isRTL ? "flex-end" : "flex-start",
              }}>
                <Ionicons name={f.icon} size={22} color={f.color} />
              </View>
              <Text style={{
                fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 3,
                textAlign: isRTL ? "right" : "left",
              }}>
                {f.title}
              </Text>
              <Text style={{ fontSize: 12, color: "#6B7280", textAlign: isRTL ? "right" : "left" }}>
                {f.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Access */}
        <Text style={{
          fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 14,
          textAlign: isRTL ? "right" : "left",
        }}>
          {t("quick_access")}
        </Text>
        {QUICK_ACCESS.map((item) => (
          <TouchableOpacity
            key={item.route}
            onPress={() => router.push(item.route as any)}
            style={{
              backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16,
              flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center",
              borderWidth: 1, borderColor: "#F3F4F6", marginBottom: 10, elevation: 1,
            }}
          >
            <View style={{
              width: 40, height: 40, borderRadius: 10, backgroundColor: item.bg,
              alignItems: "center", justifyContent: "center",
              marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
            }}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 14, fontWeight: "600", color: "#111827",
                textAlign: isRTL ? "right" : "left",
              }}>
                {item.title}
              </Text>
              <Text style={{
                fontSize: 12, color: "#6B7280", marginTop: 2,
                textAlign: isRTL ? "right" : "left",
              }}>
                {item.sub}
              </Text>
            </View>
            <Ionicons
              name={isRTL ? "chevron-back" : "chevron-forward"}
              size={18} color="#9CA3AF"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}