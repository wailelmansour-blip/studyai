// app/premium.tsx
import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Alert, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLanguageStore } from "../store/languageStore";
import { LIMITS, FILE_LIMITS } from "../types/usage";
import { useThemeStore } from "../store/themeStore";
import { Colors } from "../constants/colors";

export default function PremiumScreen() {
  const { currentLanguage } = useLanguageStore();
  const { isDark } = useThemeStore();
  const C = isDark ? Colors.dark : Colors.light;
  const isRTL = currentLanguage === "ar";

  const getLabel = (fr: string, en: string, ar: string) =>
    currentLanguage === "ar" ? ar : currentLanguage === "en" ? en : fr;

  const features = [
    {
      icon: "flash-outline",
      color: "#F59E0B",
      bgLight: "#FEF3C7", bgDark: "#2D1B00",
      title: getLabel("Plus de requêtes IA", "More AI Requests", "المزيد من طلبات الذكاء الاصطناعي"),
      free: `${LIMITS.free} / ${getLabel("jour", "day", "يوم")}`,
      premium: `${LIMITS.premium} / ${getLabel("jour", "day", "يوم")}`,
    },
    {
      icon: "document-attach-outline",
      color: "#6366F1",
      bgLight: "#EEF2FF", bgDark: "#1E1B4B",
      title: getLabel("Plus de fichiers", "More Files", "المزيد من الملفات"),
      free: `${FILE_LIMITS.free} / ${getLabel("jour", "day", "يوم")}`,
      premium: `${FILE_LIMITS.premium} / ${getLabel("jour", "day", "يوم")}`,
    },
    {
      icon: "school-outline",
      color: "#10B981",
      bgLight: "#F0FDF4", bgDark: "#022C22",
      title: getLabel("Quiz IA", "AI Quiz", "اختبارات ذكية"),
      free: `${LIMITS.free} / ${getLabel("jour", "day", "يوم")}`,
      premium: `${LIMITS.premium} / ${getLabel("jour", "day", "يوم")}`,
    },
    {
      icon: "layers-outline",
      color: "#EC4899",
      bgLight: "#FDF2F8", bgDark: "#2D0A1E",
      title: getLabel("Flashcards", "Flashcards", "بطاقات تعليمية"),
      free: `${LIMITS.free} / ${getLabel("jour", "day", "يوم")}`,
      premium: `${LIMITS.premium} / ${getLabel("jour", "day", "يوم")}`,
    },
    {
      icon: "chatbubbles-outline",
      color: "#8B5CF6",
      bgLight: "#F5F3FF", bgDark: "#1E1245",
      title: getLabel("Chat IA prioritaire", "Priority AI Chat", "محادثة ذكية مميزة"),
      free: getLabel("Standard", "Standard", "عادي"),
      premium: getLabel("Prioritaire", "Priority", "مميز"),
    },
    {
      icon: "trophy-outline",
      color: "#F59E0B",
      bgLight: "#FEF3C7", bgDark: "#2D1B00",
      title: getLabel("Badge Premium", "Premium Badge", "شارة بريميوم"),
      free: "❌",
      premium: "✨",
    },
  ];

  const handleSubscribe = () => {
    Alert.alert(
      getLabel("Bientôt disponible", "Coming Soon", "قريباً"),
      getLabel(
        "Le paiement en ligne sera disponible très prochainement.\n\nPour souscrire maintenant, contactez-nous :\nmindforge.studio.dev@gmail.com",
        "Online payment will be available very soon.\n\nTo subscribe now, contact us:\nmindforge.studio.dev@gmail.com",
        "سيكون الدفع الإلكتروني متاحاً قريباً جداً.\n\nللاشتراك الآن، تواصل معنا:\nmindforge.studio.dev@gmail.com"
      ),
      [
        { text: getLabel("Annuler", "Cancel", "إلغاء"), style: "cancel" },
        { text: getLabel("Contacter", "Contact", "تواصل"), onPress: () => Linking.openURL("mailto:mindforge.studio.dev@gmail.com") },
      ]
    );
  };

  const heroGradient = isDark ? "#3730A3" : "#6366F1";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={{
          backgroundColor: heroGradient,
          paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20,
        }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <View style={{
              width: 70, height: 70, borderRadius: 35,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center", justifyContent: "center", marginBottom: 16,
            }}>
              <Text style={{ fontSize: 36 }}>✨</Text>
            </View>
            <Text style={{ fontSize: 26, fontWeight: "800", color: "#FFFFFF", textAlign: "center" }}>
              StudyAI Premium
            </Text>
            <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 8, textAlign: "center" }}>
              {getLabel(
                "Débloquez tout le potentiel de l'IA",
                "Unlock the full potential of AI",
                "اطلق العنان لكامل إمكانيات الذكاء الاصطناعي"
              )}
            </Text>
          </View>
        </View>

        {/* Prix */}
        <View style={{
          marginHorizontal: 20, marginTop: -20,
          backgroundColor: C.card, borderRadius: 16,
          padding: 20, alignItems: "center",
          borderWidth: 1, borderColor: C.border,
          elevation: 4,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.4 : 0.08,
          shadowRadius: 8,
        }}>
          <View style={{
            backgroundColor: C.primaryLight, borderRadius: 20,
            paddingHorizontal: 14, paddingVertical: 4, marginBottom: 12,
          }}>
            <Text style={{ fontSize: 12, color: C.primary, fontWeight: "600" }}>
              {getLabel("Abonnement mensuel", "Monthly subscription", "اشتراك شهري")}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            <Text style={{ fontSize: 42, fontWeight: "800", color: C.primary }}>4.99</Text>
            <Text style={{ fontSize: 18, color: C.textSecondary, marginBottom: 6, marginLeft: 2 }}>€</Text>
            <Text style={{ fontSize: 14, color: C.textTertiary, marginBottom: 8, marginLeft: 4 }}>
              / {getLabel("mois", "month", "شهر")}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: C.textTertiary }}>
            {getLabel("Résiliable à tout moment", "Cancel anytime", "يمكن إلغاؤه في أي وقت")}
          </Text>
        </View>

        {/* Comparaison */}
        <View style={{ marginHorizontal: 20, marginTop: 24 }}>
          <Text style={{
            fontSize: 15, fontWeight: "700", color: C.text,
            marginBottom: 12, textAlign: isRTL ? "right" : "left",
          }}>
            {getLabel("Ce que vous obtenez", "What you get", "ما ستحصل عليه")}
          </Text>

          {/* En-tête tableau */}
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            backgroundColor: heroGradient,
            borderRadius: 12, padding: 12, marginBottom: 2,
          }}>
            <Text style={{ flex: 2, fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "600", textAlign: isRTL ? "right" : "left" }}>
              {getLabel("Fonctionnalité", "Feature", "الميزة")}
            </Text>
            <Text style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "600", textAlign: "center" }}>
              {getLabel("Gratuit", "Free", "مجاني")}
            </Text>
            <Text style={{ flex: 1, fontSize: 12, color: "#FCD34D", fontWeight: "700", textAlign: "center" }}>
              ✨ Premium
            </Text>
          </View>

          {/* Lignes features */}
          <View style={{
            backgroundColor: C.card, borderRadius: 12,
            borderWidth: 1, borderColor: C.border, overflow: "hidden",
          }}>
            {features.map((feature, index) => {
              const featureBg = isDark ? feature.bgDark : feature.bgLight;
              return (
                <View
                  key={index}
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center", padding: 12,
                    borderBottomWidth: index < features.length - 1 ? 1 : 0,
                    borderBottomColor: C.border,
                  }}
                >
                  <View style={{
                    flex: 2, flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center", gap: 8,
                  }}>
                    <View style={{
                      width: 30, height: 30, borderRadius: 8,
                      backgroundColor: featureBg,
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Ionicons name={feature.icon as any} size={16} color={feature.color} />
                    </View>
                    <Text style={{
                      fontSize: 12, color: C.text, fontWeight: "500",
                      flex: 1, textAlign: isRTL ? "right" : "left",
                    }}>
                      {feature.title}
                    </Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 11, color: C.textTertiary, textAlign: "center" }}>
                    {feature.free}
                  </Text>
                  <Text style={{ flex: 1, fontSize: 11, color: C.primary, fontWeight: "700", textAlign: "center" }}>
                    {feature.premium}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Bouton S'abonner */}
        <View style={{ marginHorizontal: 20, marginTop: 24 }}>
          <TouchableOpacity
            onPress={handleSubscribe}
            style={{
              backgroundColor: C.primary, borderRadius: 16,
              padding: 18, alignItems: "center", elevation: 4,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFFFFF" }}>
              ✨ {getLabel("S'abonner — 4.99€/mois", "Subscribe — €4.99/month", "اشترك — 4.99€/شهر")}
            </Text>
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
              {getLabel("Résiliable à tout moment", "Cancel anytime", "يمكن إلغاؤه في أي وقت")}
            </Text>
          </TouchableOpacity>

          <Text style={{
            fontSize: 11, color: C.textTertiary, textAlign: "center",
            marginTop: 12, lineHeight: 16,
          }}>
            {getLabel(
              "En vous abonnant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.",
              "By subscribing, you agree to our terms of service and privacy policy.",
              "بالاشتراك، فإنك توافق على شروط الاستخدام وسياسة الخصوصية."
            )}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}