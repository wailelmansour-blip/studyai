// app/(tabs)/home.tsx
import React, { useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StatusBar, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../../store/languageStore";
import { useUsageStore } from "../../store/usageStore";
import { LIMITS } from "../../types/usage";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

interface FeatureCard {
  icon: any;
  titleKey: string;
  descKey: string;
  route: string;
  gradient: [string, string];
  emoji: string;
}

const FEATURES: FeatureCard[] = [
  {
    icon: "document-text-outline",
    titleKey: "summary_screen_title",
    descKey: "summary_desc",
    route: "/summary",
    gradient: ["#6366F1", "#8B5CF6"],
    emoji: "📋",
  },
  {
    icon: "bulb-outline",
    titleKey: "explain_title_screen",
    descKey: "explain_desc",
    route: "/explain",
    gradient: ["#F59E0B", "#EF4444"],
    emoji: "💡",
  },
  {
    icon: "calculator-outline",
    titleKey: "solve_title_screen",
    descKey: "solve_desc",
    route: "/solve",
    gradient: ["#10B981", "#059669"],
    emoji: "🧮",
  },
  {
    icon: "layers-outline",
    titleKey: "flashcards_title_screen",
    descKey: "flashcards_desc",
    route: "/flashcards",
    gradient: ["#3B82F6", "#1D4ED8"],
    emoji: "🃏",
  },
  {
    icon: "help-circle-outline",
    titleKey: "quiz_screen_title",
    descKey: "quiz_desc",
    route: "/quiz",
    gradient: ["#EC4899", "#BE185D"],
    emoji: "❓",
  },
  {
    icon: "calendar-outline",
    titleKey: "plan_screen_title",
    descKey: "plan_desc",
    route: "/plan",
    gradient: ["#14B8A6", "#0F766E"],
    emoji: "📅",
  },
  {
    icon: "chatbubbles-outline",
    titleKey: "chat_screen_title",
    descKey: "chat_desc",
    route: "/chat",
    gradient: ["#F97316", "#EA580C"],
    emoji: "💬",
  },
];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const { usage } = useUsageStore();
  const isRTL = currentLanguage === "ar";

  const displayName = user?.email?.split("@")[0] || "Étudiant";
  const greeting =
    currentLanguage === "ar" ? `مرحباً، ${displayName} 👋`
    : currentLanguage === "en" ? `Hello, ${displayName} 👋`
    : `Bonjour, ${displayName} 👋`;

  const subtitle =
    currentLanguage === "ar" ? "ماذا تريد أن تتعلم اليوم؟"
    : currentLanguage === "en" ? "What do you want to learn today?"
    : "Que veux-tu apprendre aujourd'hui ?";

  const remaining = usage
    ? Math.max(0, LIMITS[usage.plan] - usage.count)
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── Hero Header ── */}
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 20, paddingBottom: 36,
            paddingHorizontal: 24, borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          {/* Greeting */}
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            justifyContent: "space-between", alignItems: "center",
            marginBottom: 20,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 26, fontWeight: "800", color: "#FFFFFF",
                textAlign: isRTL ? "right" : "left",
              }}>
                {greeting}
              </Text>
              <Text style={{
                fontSize: 15, color: "#C7D2FE", marginTop: 4,
                textAlign: isRTL ? "right" : "left",
              }}>
                {subtitle}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile")}
              style={{
                width: 48, height: 48, borderRadius: 24,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center", justifyContent: "center",
                marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#FFF" }}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Usage Card */}
          {usage && (
            <View style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: 16, padding: 16,
              borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
            }}>
              <View style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                justifyContent: "space-between", alignItems: "center",
                marginBottom: 10,
              }}>
                <View style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center", gap: 6,
                }}>
                  <Ionicons name="flash" size={16} color="#FDE68A" />
                  <Text style={{ fontSize: 13, color: "#FDE68A", fontWeight: "600" }}>
                    {usage.plan === "premium" ? "PREMIUM ✨"
                      : currentLanguage === "ar" ? "الخطة المجانية"
                      : currentLanguage === "en" ? "Free Plan"
                      : "Plan Gratuit"}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: "#E0E7FF", fontWeight: "600" }}>
                  {remaining !== null
                    ? currentLanguage === "ar" ? `${remaining} طلب متبقي`
                    : currentLanguage === "en" ? `${remaining} left`
                    : `${remaining} restantes`
                    : ""}
                </Text>
              </View>
              <View style={{
                height: 6, backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: 3, overflow: "hidden",
              }}>
                <View style={{
                  height: 6,
                  width: `${Math.min(100, (usage.count / LIMITS[usage.plan]) * 100)}%`,
                  backgroundColor: remaining === 0 ? "#FCA5A5" : "#A5F3FC",
                  borderRadius: 3,
                }} />
              </View>
            </View>
          )}
        </LinearGradient>

        {/* ── Section titre ── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 16 }}>
          <Text style={{
            fontSize: 20, fontWeight: "800", color: "#111827",
            textAlign: isRTL ? "right" : "left",
          }}>
            {currentLanguage === "ar" ? "🚀 أدوات الذكاء الاصطناعي"
              : currentLanguage === "en" ? "🚀 AI Tools"
              : "🚀 Outils IA"}
          </Text>
        </View>

        {/* ── Feature Grid ── */}
        <View style={{
          paddingHorizontal: 16,
          flexDirection: "row", flexWrap: "wrap", gap: 12,
        }}>
          {FEATURES.map((feature) => (
            <TouchableOpacity
              key={feature.route}
              onPress={() => router.push(feature.route as any)}
              activeOpacity={0.85}
              style={{
                width: (width - 44) / 2,
                borderRadius: 20, overflow: "hidden",
                elevation: 4,
                shadowColor: "#6366F1",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
              }}
            >
              <LinearGradient
                colors={feature.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 20, minHeight: 130 }}
              >
                <Text style={{ fontSize: 32, marginBottom: 12 }}>
                  {feature.emoji}
                </Text>
                <Text style={{
                  fontSize: 15, fontWeight: "700", color: "#FFFFFF",
                  marginBottom: 4,
                  textAlign: isRTL ? "right" : "left",
                }}>
                  {t(feature.titleKey)}
                </Text>
                <View style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center", marginTop: 8,
                }}>
                  <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
                    {currentLanguage === "ar" ? "ابدأ ←"
                      : currentLanguage === "en" ? "Start →"
                      : "Commencer →"}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}