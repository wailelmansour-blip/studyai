// app/about.tsx
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLanguageStore } from "../store/languageStore";
import Constants from "expo-constants";

const AIModelBadge = ({
  getLabel,
}: {
  isRTL: boolean;
  getLabel: (fr: string, en: string, ar: string) => string;
}) => {
  const aiModel = Constants.expoConfig?.extra?.aiModel || "gpt-4o-mini";
  return (
    <Text style={{ fontSize: 13, color: "#6366F1", fontWeight: "600" }}>
      {getLabel("Propulsé par", "Powered by", "مدعوم بـ")} {aiModel}
    </Text>
  );
};

export default function AboutScreen() {
  const { currentLanguage } = useLanguageStore();
  const isRTL = currentLanguage === "ar";

  const getLabel = (fr: string, en: string, ar: string) =>
    currentLanguage === "ar" ? ar : currentLanguage === "en" ? en : fr;

  const version = Constants.expoConfig?.version || "1.0.0";

  const features = [
    {
      icon: "sparkles-outline",
      title: getLabel("Quiz IA", "AI Quiz", "اختبارات ذكية"),
      desc: getLabel(
        "Génère des quiz personnalisés sur n'importe quel sujet.",
        "Generates personalized quizzes on any topic.",
        "توليد اختبارات مخصصة حول أي موضوع."
      ),
    },
    {
      icon: "layers-outline",
      title: getLabel("Flashcards", "Flashcards", "بطاقات تعليمية"),
      desc: getLabel(
        "Crée des cartes mémoire pour mémoriser efficacement.",
        "Create memory cards to memorize effectively.",
        "إنشاء بطاقات تعليمية للحفظ الفعّال."
      ),
    },
    {
      icon: "document-text-outline",
      title: getLabel("Résumés", "Summaries", "ملخصات"),
      desc: getLabel(
        "Résume n'importe quel texte ou document en quelques secondes.",
        "Summarize any text or document in seconds.",
        "تلخيص أي نص أو مستند في ثوانٍ."
      ),
    },
    {
      icon: "calendar-outline",
      title: getLabel("Plans d'étude", "Study Plans", "خطط الدراسة"),
      desc: getLabel(
        "Planifie tes révisions intelligemment avant les examens.",
        "Plan your revisions smartly before exams.",
        "خطط لمراجعاتك بذكاء قبل الامتحانات."
      ),
    },
    {
      icon: "chatbubbles-outline",
      title: getLabel("Chat IA", "AI Chat", "محادثة ذكية"),
      desc: getLabel(
        "Pose toutes tes questions à ton assistant IA.",
        "Ask your AI assistant any question.",
        "اسأل مساعدك الذكي أي سؤال."
      ),
    },
    {
      icon: "bulb-outline",
      title: getLabel("Explications", "Explanations", "شروحات"),
      desc: getLabel(
        "Obtiens des explications claires sur n'importe quel concept.",
        "Get clear explanations on any concept.",
        "احصل على شروحات واضحة لأي مفهوم."
      ),
    },
  ];

  const links = [
    {
      icon: "mail-outline",
      label: getLabel("Nous contacter", "Contact us", "تواصل معنا"),
      onPress: () => Linking.openURL("mailto:mindforge.studio.dev@gmail.com"),
    },
    {
      icon: "shield-checkmark-outline",
      label: getLabel("Politique de confidentialité", "Privacy Policy", "سياسة الخصوصية"),
      onPress: () => Linking.openURL("https://studyai-ab88e.web.app/privacy.html"),
    },
    {
      icon: "document-outline",
      label: getLabel("Conditions d'utilisation", "Terms of Service", "شروط الاستخدام"),
      onPress: () => Linking.openURL("https://studyai-ab88e.web.app/terms.html"),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        {/* Header */}
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", marginBottom: 24,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}
          >
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827" }}>
            {getLabel("À propos", "About", "حول التطبيق")}
          </Text>
        </View>

        {/* Logo + App info */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View style={{
            width: 90, height: 90, borderRadius: 24,
            backgroundColor: "#6366F1", alignItems: "center",
            justifyContent: "center", marginBottom: 16,
          }}>
            <Ionicons name="school" size={48} color="#FFFFFF" />
          </View>

          <Text style={{ fontSize: 26, fontWeight: "800", color: "#111827" }}>
            StudyAI
          </Text>

          <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
            {getLabel("Version", "Version", "الإصدار")} {version}
          </Text>

          <View style={{
            backgroundColor: "#EEF2FF", borderRadius: 20,
            paddingHorizontal: 16, paddingVertical: 6, marginTop: 10,
          }}>
            <AIModelBadge isRTL={isRTL} getLabel={getLabel} />
          </View>
        </View>

        {/* Description */}
        <View style={{
          backgroundColor: "#FFFFFF", borderRadius: 14,
          padding: 16, marginBottom: 20,
          borderWidth: 1, borderColor: "#F3F4F6",
        }}>
          <Text style={{
            fontSize: 14, color: "#374151", lineHeight: 22,
            textAlign: isRTL ? "right" : "left",
          }}>
            {getLabel(
              "StudyAI est ton assistant d'étude intelligent. Il t'aide à apprendre plus efficacement grâce à l'intelligence artificielle — que ce soit pour préparer un examen, comprendre un concept difficile ou organiser tes révisions.",
              "StudyAI is your smart study assistant. It helps you learn more effectively using artificial intelligence — whether preparing for an exam, understanding a difficult concept, or organizing your revisions.",
              "StudyAI هو مساعدك الذكي للدراسة. يساعدك على التعلم بشكل أكثر فعالية باستخدام الذكاء الاصطناعي — سواء للتحضير لامتحان أو فهم مفهوم صعب أو تنظيم مراجعاتك."
            )}
          </Text>
        </View>

        {/* Fonctionnalités */}
        <Text style={{
          fontSize: 15, fontWeight: "700", color: "#111827",
          marginBottom: 12, textAlign: isRTL ? "right" : "left",
        }}>
          ✨ {getLabel("Fonctionnalités", "Features", "المميزات")}
        </Text>

        <View style={{
          backgroundColor: "#FFFFFF", borderRadius: 14,
          borderWidth: 1, borderColor: "#F3F4F6",
          marginBottom: 20, overflow: "hidden",
        }}>
          {features.map((feature, index) => (
            <View
              key={index}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "flex-start", padding: 14,
                borderBottomWidth: index < features.length - 1 ? 1 : 0,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: "#EEF2FF", alignItems: "center",
                justifyContent: "center", flexShrink: 0,
                marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
              }}>
                <Ionicons name={feature.icon as any} size={18} color="#6366F1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 14, fontWeight: "600", color: "#111827",
                  textAlign: isRTL ? "right" : "left", marginBottom: 2,
                }}>
                  {feature.title}
                </Text>
                <Text style={{
                  fontSize: 12, color: "#6B7280", lineHeight: 18,
                  textAlign: isRTL ? "right" : "left",
                }}>
                  {feature.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Liens */}
        <Text style={{
          fontSize: 15, fontWeight: "700", color: "#111827",
          marginBottom: 12, textAlign: isRTL ? "right" : "left",
        }}>
          🔗 {getLabel("Liens utiles", "Useful links", "روابط مفيدة")}
        </Text>

        <View style={{
          backgroundColor: "#FFFFFF", borderRadius: 14,
          borderWidth: 1, borderColor: "#F3F4F6",
          marginBottom: 20, overflow: "hidden",
        }}>
          {links.map((link, index) => (
            <TouchableOpacity
              key={index}
              onPress={link.onPress}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center", padding: 16,
                borderBottomWidth: index < links.length - 1 ? 1 : 0,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: "#EEF2FF", alignItems: "center",
                justifyContent: "center",
                marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
              }}>
                <Ionicons name={link.icon as any} size={18} color="#6366F1" />
              </View>
              <Text style={{
                flex: 1, fontSize: 14, color: "#374151",
                fontWeight: "500", textAlign: isRTL ? "right" : "left",
              }}>
                {link.label}
              </Text>
              <Ionicons
                name={isRTL ? "chevron-back" : "chevron-forward"}
                size={16} color="#D1D5DB"
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
            {getLabel(
              "Fait avec ❤️ par MindForge Studio",
              "Made with ❤️ by MindForge Studio",
              "صُنع بـ ❤️ من MindForge Studio"
            )}
          </Text>
          <Text style={{ fontSize: 11, color: "#D1D5DB", marginTop: 4 }}>
            © 2025 StudyAI. {getLabel("Tous droits réservés.", "All rights reserved.", "جميع الحقوق محفوظة.")}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}