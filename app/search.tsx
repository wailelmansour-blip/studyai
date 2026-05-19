// app/search.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  getFirestore, collection, query,
  where, orderBy, limit, getDocs,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { useLanguageStore } from "../store/languageStore";
import { useThemeStore } from "../store/themeStore";
import { Colors } from "../constants/colors";

interface SearchResult {
  id: string;
  type: "quiz" | "summary" | "flashcard" | "plan" | "explanation" | "solution" | "chat";
  title: string;
  subtitle?: string;
  createdAt: string;
}

const TYPE_CONFIG = {
  quiz:        { icon: "🧠", colorLight: "#EC4899", bgLight: "#FDF2F8", colorDark: "#F472B6", bgDark: "#2D0A1E", label: { fr: "Quiz",          en: "Quiz",          ar: "اختبارات"    } },
  summary:     { icon: "📄", colorLight: "#6366F1", bgLight: "#EEF2FF", colorDark: "#818CF8", bgDark: "#1E1B4B", label: { fr: "Résumés",       en: "Summaries",     ar: "ملخصات"      } },
  flashcard:   { icon: "🃏", colorLight: "#3B82F6", bgLight: "#EFF6FF", colorDark: "#60A5FA", bgDark: "#1E3A5F", label: { fr: "Flashcards",    en: "Flashcards",    ar: "بطاقات"      } },
  plan:        { icon: "📅", colorLight: "#14B8A6", bgLight: "#F0FDFA", colorDark: "#2DD4BF", bgDark: "#022C26", label: { fr: "Plans d'étude", en: "Study Plans",   ar: "خطط الدراسة" } },
  explanation: { icon: "💡", colorLight: "#F59E0B", bgLight: "#FFFBEB", colorDark: "#FCD34D", bgDark: "#2D1B00", label: { fr: "Explications",  en: "Explanations",  ar: "شروحات"      } },
  solution:    { icon: "✏️", colorLight: "#10B981", bgLight: "#F0FDF4", colorDark: "#34D399", bgDark: "#022C22", label: { fr: "Solutions",     en: "Solutions",     ar: "حلول"        } },
  chat:        { icon: "💬", colorLight: "#8B5CF6", bgLight: "#F5F3FF", colorDark: "#A78BFA", bgDark: "#1E1245", label: { fr: "Chat IA",       en: "AI Chat",       ar: "محادثات"     } },
};

const COLLECTIONS = [
  { name: "quizzes",      type: "quiz",        field: "topic"      },
  { name: "summaries",    type: "summary",     field: "summary"    },
  { name: "flashcards",   type: "flashcard",   field: "topic"      },
  { name: "plans",        type: "plan",        field: "title"      },
  { name: "explanations", type: "explanation", field: "inputText"  },
  { name: "solutions",    type: "solution",    field: "exercise"   },
  { name: "chatSessions", type: "chat",        field: "courseName" },
];

export default function SearchScreen() {
  const { currentLanguage } = useLanguageStore();
  const { isDark } = useThemeStore();
  const C = isDark ? Colors.dark : Colors.light;
  const isRTL = currentLanguage === "ar";
  const db = getFirestore(getApp());
  const auth = getAuth(getApp());

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const getLabel = (fr: string, en: string, ar: string) =>
    currentLanguage === "ar" ? ar : currentLanguage === "en" ? en : fr;

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(() => handleSearch(), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getDisplayTitle = (type: string, data: any, field: string): string => {
    const raw = data[field] || "";
    if (type === "summary" || type === "explanation") {
      return raw.substring(0, 80) + (raw.length > 80 ? "..." : "");
    }
    return raw;
  };

  const getSubtitle = (type: string, data: any): string => {
    if (type === "quiz") return `${data.score ?? 0}/${data.total ?? 0}`;
    if (type === "solution") return data.subject || "";
    if (type === "plan") return data.subjects?.[0] || "";
    if (type === "flashcard") return `${data.flashcards?.length || 0} cartes`;
    return data.language || "";
  };

  const handleSearch = async () => {
    const user = auth.currentUser;
    if (!user || searchQuery.trim().length < 2) return;

    setLoading(true);
    setSearched(true);

    try {
      const allResults: SearchResult[] = [];
      const q = searchQuery.trim().toLowerCase();

      await Promise.all(
        COLLECTIONS.map(async (col) => {
          try {
            const snap = await getDocs(
              query(
                collection(db, col.name),
                where("userId", "==", user.uid),
                orderBy("createdAt", "desc"),
                limit(20)
              )
            );

            snap.docs.forEach((doc) => {
              const data = doc.data();

              if (col.type === "chat") {
                const courseName = (data.courseName || "").toLowerCase();
                const messages = data.messages || [];
                const courseMatch = courseName.includes(q);
                const matchedMsg = messages.find((msg: any) =>
                  (msg.content || "").toLowerCase().includes(q)
                );

                if (courseMatch || matchedMsg) {
                  allResults.push({
                    id: doc.id,
                    type: "chat",
                    title: data.courseName || "",
                    subtitle: matchedMsg
                      ? (matchedMsg.content || "").substring(0, 60) + "..."
                      : "",
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                  });
                }
              } else {
                const fieldValue = (data[col.field] || "").toLowerCase();
                if (fieldValue.includes(q)) {
                  allResults.push({
                    id: doc.id,
                    type: col.type as SearchResult["type"],
                    title: getDisplayTitle(col.type, data, col.field),
                    subtitle: getSubtitle(col.type, data),
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                  });
                }
              }
            });
          } catch (e) {
            console.log(`Search error in ${col.name}:`, e);
          }
        })
      );

      allResults.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setResults(allResults);
    } catch (e) {
      console.log("Search error:", e);
    } finally {
      setLoading(false);
    }
  };

  const grouped = results.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const getRouteForType = (type: string): string => {
    switch (type) {
      case "quiz":        return "/quiz";
      case "summary":     return "/summary";
      case "flashcard":   return "/flashcards";
      case "plan":        return "/plan";
      case "explanation": return "/explain";
      case "solution":    return "/solve";
      case "chat":        return "/chat";
      default:            return "/";
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>

      {/* Header */}
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center", padding: 16,
        backgroundColor: C.card,
        borderBottomWidth: 1, borderBottomColor: C.border,
        gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24} color={C.text}
          />
        </TouchableOpacity>

        <View style={{
          flex: 1, flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          backgroundColor: isDark ? "#0F172A" : "#F3F4F6",
          borderRadius: 12, paddingHorizontal: 12,
          borderWidth: isDark ? 1 : 0,
          borderColor: C.borderMedium,
        }}>
          <Ionicons name="search-outline" size={18} color={C.textTertiary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={getLabel(
              "Rechercher dans l'historique...",
              "Search history...",
              "بحث في السجل..."
            )}
            placeholderTextColor={C.textTertiary}
            autoFocus
            textAlign={isRTL ? "right" : "left"}
            style={{
              flex: 1, padding: 10, fontSize: 15,
              color: C.text,
              writingDirection: isRTL ? "rtl" : "ltr",
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={C.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Loading */}
        {loading && (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={{ fontSize: 13, color: C.textTertiary, marginTop: 12 }}>
              {getLabel("Recherche en cours...", "Searching...", "جارٍ البحث...")}
            </Text>
          </View>
        )}

        {/* Aucun résultat */}
        {!loading && searched && results.length === 0 && (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>🔍</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 8 }}>
              {getLabel("Aucun résultat", "No results", "لا توجد نتائج")}
            </Text>
            <Text style={{ fontSize: 13, color: C.textTertiary, textAlign: "center" }}>
              {getLabel(
                `Aucun résultat pour "${searchQuery}"`,
                `No results for "${searchQuery}"`,
                `لا توجد نتائج لـ "${searchQuery}"`
              )}
            </Text>
          </View>
        )}

        {/* Placeholder initial */}
        {!loading && !searched && (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>🔎</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 8 }}>
              {getLabel("Recherche globale", "Global Search", "بحث شامل")}
            </Text>
            <Text style={{ fontSize: 13, color: C.textTertiary, textAlign: "center", lineHeight: 20 }}>
              {getLabel(
                "Cherche dans tous tes quiz, résumés,\nflashcards, plans et plus encore.",
                "Search across all your quizzes, summaries,\nflashcards, plans and more.",
                "ابحث في جميع اختباراتك وملخصاتك\nوبطاقاتك وخططك والمزيد."
              )}
            </Text>

            <View style={{
              flexDirection: "row", flexWrap: "wrap", gap: 8,
              marginTop: 24, justifyContent: "center",
            }}>
              {Object.entries(TYPE_CONFIG).map(([type, config]) => {
                const color = isDark ? config.colorDark : config.colorLight;
                const bg = isDark ? config.bgDark : config.bgLight;
                return (
                  <View
                    key={type}
                    style={{
                      backgroundColor: bg, borderRadius: 20,
                      paddingHorizontal: 12, paddingVertical: 6,
                      flexDirection: "row", alignItems: "center", gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>{config.icon}</Text>
                    <Text style={{ fontSize: 12, color, fontWeight: "600" }}>
                      {config.label[currentLanguage as keyof typeof config.label] || config.label.fr}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Résultats groupés */}
        {!loading && results.length > 0 && (
          <View>
            <Text style={{
              fontSize: 13, color: C.textTertiary, marginBottom: 16,
              textAlign: isRTL ? "right" : "left",
            }}>
              {results.length} {getLabel("résultat(s)", "result(s)", "نتيجة")}
            </Text>

            {Object.entries(grouped).map(([type, items]) => {
              const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
              const color = isDark ? config.colorDark : config.colorLight;
              const bg = isDark ? config.bgDark : config.bgLight;

              return (
                <View key={type} style={{ marginBottom: 20 }}>
                  {/* En-tête de groupe */}
                  <View style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center", gap: 8, marginBottom: 10,
                  }}>
                    <Text style={{ fontSize: 16 }}>{config.icon}</Text>
                    <Text style={{ fontSize: 13, fontWeight: "700", color }}>
                      {config.label[currentLanguage as keyof typeof config.label] || config.label.fr}
                    </Text>
                    <View style={{
                      backgroundColor: bg, borderRadius: 10,
                      paddingHorizontal: 8, paddingVertical: 2,
                    }}>
                      <Text style={{ fontSize: 11, color, fontWeight: "600" }}>
                        {items.length}
                      </Text>
                    </View>
                  </View>

                  {/* Items */}
                  <View style={{
                    backgroundColor: C.card, borderRadius: 14,
                    borderWidth: 1, borderColor: C.border, overflow: "hidden",
                  }}>
                    {items.map((item, index) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => router.push(getRouteForType(item.type) as any)}
                        style={{
                          flexDirection: isRTL ? "row-reverse" : "row",
                          alignItems: "center", padding: 14,
                          borderBottomWidth: index < items.length - 1 ? 1 : 0,
                          borderBottomColor: C.border,
                        }}
                      >
                        <View style={{
                          width: 36, height: 36, borderRadius: 10,
                          backgroundColor: bg,
                          alignItems: "center", justifyContent: "center",
                          marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
                          flexShrink: 0,
                        }}>
                          <Text style={{ fontSize: 16 }}>{config.icon}</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14, fontWeight: "600", color: C.text,
                              textAlign: isRTL ? "right" : "left",
                            }}
                            numberOfLines={2}
                          >
                            {item.title}
                          </Text>
                          {item.subtitle ? (
                            <Text
                              style={{
                                fontSize: 12, color: C.textSecondary, marginTop: 3,
                                textAlign: isRTL ? "right" : "left",
                              }}
                              numberOfLines={1}
                            >
                              {item.subtitle}
                            </Text>
                          ) : null}
                          <Text style={{
                            fontSize: 11, color: C.textTertiary, marginTop: 2,
                            textAlign: isRTL ? "right" : "left",
                          }}>
                            {new Date(item.createdAt).toLocaleDateString(
                              currentLanguage === "ar" ? "ar-SA"
                              : currentLanguage === "en" ? "en-GB" : "fr-FR"
                            )}
                          </Text>
                        </View>

                        <Ionicons
                          name={isRTL ? "chevron-back" : "chevron-forward"}
                          size={16} color={C.borderMedium}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}