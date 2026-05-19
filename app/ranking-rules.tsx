// app/ranking-rules.tsx
import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLanguageStore } from "../store/languageStore";
import { useThemeStore } from "../store/themeStore";
import { Colors } from "../constants/colors";

export default function RankingRulesScreen() {
  const { currentLanguage } = useLanguageStore();
  const { isDark } = useThemeStore();
  const C = isDark ? Colors.dark : Colors.light;
  const isRTL = currentLanguage === "ar";

  const getLabel = (fr: string, en: string, ar: string) =>
    currentLanguage === "ar" ? ar : currentLanguage === "en" ? en : fr;

  const points = [
    { icon: "🧠", action: getLabel("Quiz complété", "Quiz completed", "اختبار مكتمل"), pts: "+10" },
    { icon: "🎯", action: getLabel("Score quiz ≥ 80%", "Quiz score ≥ 80%", "نتيجة اختبار ≥ 80%"), pts: "+5" },
    { icon: "📄", action: getLabel("Résumé généré", "Summary generated", "ملخص منشأ"), pts: "+5" },
    { icon: "🃏", action: getLabel("Flashcards créées", "Flashcards created", "بطاقات منشأة"), pts: "+5" },
    { icon: "📅", action: getLabel("Plan d'étude généré", "Study plan generated", "خطة دراسية منشأة"), pts: "+5" },
    { icon: "💡", action: getLabel("Explication demandée", "Explanation requested", "شرح مطلوب"), pts: "+3" },
    { icon: "✏️", action: getLabel("Solution demandée", "Solution requested", "حل مطلوب"), pts: "+3" },
    { icon: "💬", action: getLabel("Message chat IA", "AI chat message", "رسالة في المحادثة"), pts: "+2" },
    { icon: "🔥", action: getLabel("Streak jour consécutif", "Daily streak", "يوم متتالي"), pts: "+2" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
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
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={C.text} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "700", color: C.text }}>
              {getLabel("Règles du classement", "Ranking Rules", "قواعد التصنيف")}
            </Text>
            <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
              {getLabel("Comment gagner des points ?", "How to earn points?", "كيف تكسب النقاط؟")}
            </Text>
          </View>
        </View>

        {/* Intro */}
        <View style={{
          backgroundColor: C.primaryLight, borderRadius: 14,
          padding: 16, marginBottom: 24,
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "flex-start", gap: 12,
          borderWidth: 1, borderColor: isDark ? "#3730A3" : "#C7D2FE",
        }}>
          <Text style={{ fontSize: 28 }}>🏆</Text>
          <Text style={{
            flex: 1, fontSize: 13,
            color: isDark ? C.primaryDark : "#3730A3",
            lineHeight: 20, textAlign: isRTL ? "right" : "left",
          }}>
            {getLabel(
              "Le classement récompense toutes les formes d'apprentissage. Plus tu utilises StudyAI, plus tu gagnes de points !",
              "The ranking rewards all forms of learning. The more you use StudyAI, the more points you earn!",
              "يكافئ التصنيف جميع أشكال التعلم. كلما استخدمت StudyAI أكثر، كلما حصلت على نقاط أكثر!"
            )}
          </Text>
        </View>

        {/* Points */}
        <Text style={{
          fontSize: 15, fontWeight: "700", color: C.text,
          marginBottom: 12, textAlign: isRTL ? "right" : "left",
        }}>
          ⚡ {getLabel("Système de points", "Points System", "نظام النقاط")}
        </Text>

        <View style={{
          backgroundColor: C.card, borderRadius: 14,
          borderWidth: 1, borderColor: C.border,
          marginBottom: 24, overflow: "hidden",
        }}>
          {points.map((item, index) => (
            <View
              key={index}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center", padding: 14,
                borderBottomWidth: index < points.length - 1 ? 1 : 0,
                borderBottomColor: C.border,
              }}
            >
              <Text style={{
                fontSize: 22,
                marginRight: isRTL ? 0 : 12,
                marginLeft: isRTL ? 12 : 0,
              }}>
                {item.icon}
              </Text>
              <Text style={{
                flex: 1, fontSize: 14, color: C.text,
                textAlign: isRTL ? "right" : "left",
              }}>
                {item.action}
              </Text>
              <View style={{
                backgroundColor: C.primaryLight, borderRadius: 8,
                paddingHorizontal: 10, paddingVertical: 4,
              }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: C.primary }}>
                  {item.pts}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Streak */}
        <View style={{
          backgroundColor: isDark ? "#2D1B00" : "#FFF7ED",
          borderRadius: 14, padding: 16, marginBottom: 24,
          borderWidth: 1, borderColor: isDark ? "#92400E" : "#FED7AA",
        }}>
          <Text style={{
            fontSize: 14, fontWeight: "700",
            color: isDark ? "#FCD34D" : "#92400E",
            marginBottom: 8, textAlign: isRTL ? "right" : "left",
          }}>
            🔥 {getLabel("Comment fonctionne le streak ?", "How does the streak work?", "كيف يعمل الستريك؟")}
          </Text>
          <Text style={{
            fontSize: 13,
            color: isDark ? "#FCD34D" : "#92400E",
            lineHeight: 20, textAlign: isRTL ? "right" : "left",
          }}>
            {getLabel(
              "Connecte-toi et utilise StudyAI chaque jour pour maintenir ton streak. Si tu rates un jour, ton streak repart de zéro. Chaque jour consécutif te rapporte +2 points bonus.",
              "Log in and use StudyAI every day to maintain your streak. If you miss a day, your streak resets to zero. Each consecutive day earns you +2 bonus points.",
              "سجّل دخولك واستخدم StudyAI كل يوم للحفاظ على الستريك. إذا فاتك يوم، يعود الستريك إلى الصفر. كل يوم متتالٍ يمنحك +2 نقاط إضافية."
            )}
          </Text>
        </View>

        {/* Trophées */}
        <View style={{
          backgroundColor: isDark ? C.card : "#F3F4F6",
          borderRadius: 14, padding: 16, marginBottom: 24,
          borderWidth: 1, borderColor: C.border,
          alignItems: "center",
        }}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>🏅</Text>
          <Text style={{
            fontSize: 14, fontWeight: "700", color: C.text,
            marginBottom: 6, textAlign: "center",
          }}>
            {getLabel("Trophées à débloquer", "Trophies to unlock", "جوائز للفتح")}
          </Text>
          <Text style={{
            fontSize: 13, color: C.textSecondary,
            lineHeight: 20, textAlign: "center",
          }}>
            {getLabel(
              "Utilise StudyAI régulièrement pour débloquer des trophées basés sur tes accomplissements.",
              "Use StudyAI regularly to unlock trophies based on your achievements.",
              "استخدم StudyAI بانتظام لفتح جوائز بناءً على إنجازاتك."
            )}
          </Text>
        </View>

        {/* Classement mondial */}
        <View style={{
          backgroundColor: isDark ? "#022C22" : "#F0FDF4",
          borderRadius: 14, padding: 16,
          borderWidth: 1, borderColor: isDark ? "#065F46" : "#BBF7D0",
        }}>
          <Text style={{
            fontSize: 14, fontWeight: "700",
            color: isDark ? "#34D399" : "#065F46",
            marginBottom: 8, textAlign: isRTL ? "right" : "left",
          }}>
            📊 {getLabel("Classement mondial", "Global Ranking", "التصنيف العالمي")}
          </Text>
          <Text style={{
            fontSize: 13,
            color: isDark ? "#34D399" : "#065F46",
            lineHeight: 20, textAlign: isRTL ? "right" : "left",
          }}>
            {getLabel(
              "Le classement affiche les 10 meilleurs utilisateurs du monde entier basé sur leur score total. Il est mis à jour en temps réel. Bonne chance ! 🚀",
              "The ranking displays the top 10 users worldwide based on their total score. It is updated in real time. Good luck! 🚀",
              "يعرض التصنيف أفضل 10 مستخدمين في العالم بناءً على مجموع نقاطهم. يتم تحديثه في الوقت الفعلي. حظاً موفقاً! 🚀"
            )}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}