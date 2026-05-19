// app/history-settings.tsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLanguageStore } from "../store/languageStore";
import { useDeleteHistory, HistoryType } from "../hooks/useDeleteHistory";
import { useHistoryStore } from "../store/historyStore";
import { useThemeStore } from "../store/themeStore";
import { Colors } from "../constants/colors";

export default function HistorySettingsScreen() {
  const { currentLanguage } = useLanguageStore();
  const { isDark } = useThemeStore();
  const C = isDark ? Colors.dark : Colors.light;
  const isRTL = currentLanguage === "ar";
  const { confirmDeleteAll } = useDeleteHistory();
  const { triggerRefresh } = useHistoryStore();

  const getLabel = (fr: string, en: string, ar: string) =>
    currentLanguage === "ar" ? ar : currentLanguage === "en" ? en : fr;

  const HISTORY_ITEMS: { type: HistoryType; labelFr: string; labelEn: string; labelAr: string; icon: string }[] = [
    { type: "quizzes",      labelFr: "Quiz",          labelEn: "Quizzes",      labelAr: "اختبارات",       icon: "🧠" },
    { type: "flashcards",   labelFr: "Flashcards",    labelEn: "Flashcards",   labelAr: "بطاقات",         icon: "🃏" },
    { type: "plans",        labelFr: "Plans d'étude", labelEn: "Study Plans",  labelAr: "خطط الدراسة",    icon: "📅" },
    { type: "summaries",    labelFr: "Résumés",       labelEn: "Summaries",    labelAr: "ملخصات",         icon: "📄" },
    { type: "explanations", labelFr: "Explications",  labelEn: "Explanations", labelAr: "شروحات",         icon: "💡" },
    { type: "solutions",    labelFr: "Solutions",     labelEn: "Solutions",    labelAr: "حلول",           icon: "✏️" },
    { type: "chatSessions", labelFr: "Chat IA",       labelEn: "AI Chat",      labelAr: "محادثات الذكاء", icon: "💬" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", marginBottom: 12,
          }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}
            >
              <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={C.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, fontWeight: "700", color: C.text }}>
              🕒 {getLabel("Historique & Sauvegardes", "History & Saved", "السجل والمحفوظات")}
            </Text>
          </View>

          {/* Barre de recherche */}
          <TouchableOpacity
            onPress={() => router.push("/search" as any)}
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center", gap: 10,
              backgroundColor: isDark ? C.card : "#F3F4F6",
              borderRadius: 12, padding: 12,
              borderWidth: 1, borderColor: C.borderMedium,
            }}
          >
            <Ionicons name="search-outline" size={18} color={C.textTertiary} />
            <Text style={{
              fontSize: 14, color: C.textTertiary, flex: 1,
              textAlign: isRTL ? "right" : "left",
            }}>
              {getLabel(
                "Rechercher dans l'historique...",
                "Search history...",
                "بحث في السجل..."
              )}
            </Text>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={C.borderMedium} />
          </TouchableOpacity>
        </View>

        {/* Info danger */}
        <View style={{
          backgroundColor: isDark ? "#2D0A0A" : "#FEF2F2",
          borderRadius: 12, padding: 14, marginBottom: 20,
          borderWidth: 1, borderColor: isDark ? "#7F1D1D" : "#FECACA",
          flexDirection: isRTL ? "row-reverse" : "row",
          gap: 10, alignItems: "flex-start",
        }}>
          <Ionicons name="warning-outline" size={18} color={C.danger} style={{ marginTop: 1 }} />
          <Text style={{
            flex: 1, fontSize: 13,
            color: isDark ? "#FCA5A5" : "#991B1B",
            lineHeight: 20, textAlign: isRTL ? "right" : "left",
          }}>
            {getLabel(
              "La suppression est irréversible. Toutes les données de la catégorie seront définitivement effacées.",
              "Deletion is irreversible. All data in the category will be permanently deleted.",
              "الحذف لا يمكن التراجع عنه. سيتم مسح جميع بيانات الفئة نهائياً."
            )}
          </Text>
        </View>

        {/* Liste */}
        <View style={{
          backgroundColor: C.card, borderRadius: 14,
          borderWidth: 1, borderColor: C.border, overflow: "hidden",
        }}>
          {HISTORY_ITEMS.map(({ type, labelFr, labelEn, labelAr, icon }, index, arr) => {
            const label = getLabel(labelFr, labelEn, labelAr);
            return (
              <View
                key={type}
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center", padding: 14,
                  borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                  borderBottomColor: C.border,
                }}
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: isDark ? "#1E293B" : "#F3F4F6",
                  alignItems: "center", justifyContent: "center",
                  marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
                }}>
                  <Text style={{ fontSize: 16 }}>{icon}</Text>
                </View>
                <Text style={{
                  flex: 1, fontSize: 14, color: C.text,
                  fontWeight: "500", textAlign: isRTL ? "right" : "left",
                }}>
                  {label}
                </Text>
                <TouchableOpacity
                  onPress={() => confirmDeleteAll(type, label, currentLanguage, () => triggerRefresh(type))}
                  style={{
                    backgroundColor: isDark ? "#2D0A0A" : "#FEF2F2",
                    paddingHorizontal: 10, paddingVertical: 6,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: isDark ? "#7F1D1D" : "#FECACA",
                  }}
                >
                  <Text style={{ fontSize: 12, color: C.danger, fontWeight: "600" }}>
                    {getLabel("Effacer", "Clear", "حذف")}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}