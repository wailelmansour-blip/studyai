// app/leaderboard.tsx
import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLanguageStore } from "../store/languageStore";
import { useStreakStore } from "../store/streakStore";
import { useAuthStore } from "../store/authStore";

export default function LeaderboardScreen() {
  const { currentLanguage } = useLanguageStore();
  const isRTL = currentLanguage === "ar";
  const { user } = useAuthStore();
  const { stats, leaderboard, isLoading, loadStats, loadLeaderboard } = useStreakStore();
  const [refreshing, setRefreshing] = useState(false);

  const getLabel = (fr: string, en: string, ar: string) =>
    currentLanguage === "ar" ? ar : currentLanguage === "en" ? en : fr;

  useEffect(() => {
    loadStats();
    loadLeaderboard();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadLeaderboard()]);
    setRefreshing(false);
  };

  const getMedalEmoji = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}`;
  };

  const myRank = leaderboard.findIndex((u) => u.userId === user?.uid);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
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
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827" }}>
              🏆 {getLabel("Classement", "Leaderboard", "التصنيف")}
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
              {getLabel("Top 10 mondial", "Global Top 10", "أفضل 10 عالميًا")}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/ranking-rules" as any)}
            style={{
              backgroundColor: "#EEF2FF", borderRadius: 10,
              padding: 8,
            }}
          >
            <Ionicons name="information-circle-outline" size={22} color="#6366F1" />
          </TouchableOpacity>
        </View>

        {/* Ma position + streak */}
        {stats && (
          <View style={{
            backgroundColor: "#6366F1", borderRadius: 16,
            padding: 16, marginBottom: 24,
          }}>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              justifyContent: "space-between", alignItems: "center",
            }}>
              <View>
                <Text style={{ fontSize: 13, color: "#C7D2FE", marginBottom: 4 }}>
                  {getLabel("Mon score", "My score", "نقاطي")}
                </Text>
                <Text style={{ fontSize: 28, fontWeight: "800", color: "#FFFFFF" }}>
                  {stats.totalPoints} pts
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 32 }}>🔥</Text>
                <Text style={{ fontSize: 13, color: "#C7D2FE", marginTop: 2 }}>
                  {stats.currentStreak} {getLabel("jours", "days", "أيام")}
                </Text>
              </View>
              <View style={{ alignItems: isRTL ? "flex-start" : "flex-end" }}>
                <Text style={{ fontSize: 13, color: "#C7D2FE", marginBottom: 4 }}>
                  {getLabel("Mon rang", "My rank", "ترتيبي")}
                </Text>
                <Text style={{ fontSize: 28, fontWeight: "800", color: "#FFFFFF" }}>
                  {myRank >= 0 ? `#${myRank + 1}` : "—"}
                </Text>
              </View>
            </View>

            {/* Barre streak */}
            <View style={{ marginTop: 16 }}>
              <View style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                justifyContent: "space-between", marginBottom: 6,
              }}>
                <Text style={{ fontSize: 12, color: "#C7D2FE" }}>
                  {getLabel("Streak actuel", "Current streak", "الستريك الحالي")}
                </Text>
                <Text style={{ fontSize: 12, color: "#C7D2FE" }}>
                  {getLabel("Record", "Best", "أفضل")}: {stats.longestStreak} {getLabel("jours", "days", "أيام")}
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: "#4338CA", borderRadius: 3 }}>
                <View style={{
                  height: 6, borderRadius: 3, backgroundColor: "#FCD34D",
                  width: `${Math.min(100, (stats.currentStreak / Math.max(stats.longestStreak, 1)) * 100)}%`,
                }} />
              </View>
            </View>
          </View>
        )}

        {/* Mes trophées */}
        {stats && stats.trophies.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 15, fontWeight: "700", color: "#111827",
              marginBottom: 12, textAlign: isRTL ? "right" : "left",
            }}>
              🏅 {getLabel("Mes trophées", "My Trophies", "جوائزي")} ({stats.trophies.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {stats.trophies.map((trophy) => (
                  <View
                    key={trophy.id}
                    style={{
                      backgroundColor: "#FFFFFF", borderRadius: 14,
                      padding: 14, alignItems: "center", minWidth: 90,
                      borderWidth: 1, borderColor: "#F3F4F6",
                    }}
                  >
                    <Text style={{ fontSize: 30 }}>{trophy.icon}</Text>
                    <Text style={{
                      fontSize: 11, fontWeight: "600", color: "#374151",
                      marginTop: 6, textAlign: "center",
                    }}>
                      {currentLanguage === "ar" ? trophy.nameAr
                        : currentLanguage === "en" ? trophy.nameEn
                        : trophy.nameFr}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Trophées vides */}
        {stats && stats.trophies.length === 0 && (
          <View style={{
            backgroundColor: "#F3F4F6", borderRadius: 14, padding: 16,
            marginBottom: 24, alignItems: "center",
            borderWidth: 1, borderColor: "#E5E7EB",
          }}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>🏅</Text>
            <Text style={{
              fontSize: 14, fontWeight: "600", color: "#374151",
              marginBottom: 4, textAlign: "center",
            }}>
              {getLabel("Aucun trophée encore", "No trophies yet", "لا توجد جوائز بعد")}
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 20 }}>
              {getLabel(
                "Utilise StudyAI régulièrement pour débloquer des trophées.",
                "Use StudyAI regularly to unlock trophies.",
                "استخدم StudyAI بانتظام لفتح الجوائز."
              )}
            </Text>
          </View>
        )}

        {/* Classement */}
        <Text style={{
          fontSize: 15, fontWeight: "700", color: "#111827",
          marginBottom: 12, textAlign: isRTL ? "right" : "left",
        }}>
          📊 {getLabel("Top 10", "Top 10", "أفضل 10")}
        </Text>

        {isLoading ? (
          <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
        ) : (
          <View style={{
            backgroundColor: "#FFFFFF", borderRadius: 14,
            borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden",
          }}>
            {leaderboard.length === 0 ? (
              <View style={{ padding: 32, alignItems: "center" }}>
                <Text style={{ fontSize: 13, color: "#9CA3AF" }}>
                  {getLabel("Aucun utilisateur encore.", "No users yet.", "لا يوجد مستخدمون بعد.")}
                </Text>
              </View>
            ) : (
              leaderboard.map((entry, index) => {
                const isMe = entry.userId === user?.uid;
                return (
                  <View
                    key={entry.userId}
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center", padding: 14,
                      borderBottomWidth: index < leaderboard.length - 1 ? 1 : 0,
                      borderBottomColor: "#F3F4F6",
                      backgroundColor: isMe ? "#EEF2FF" : "#FFFFFF",
                    }}
                  >
                    {/* Rang */}
                    <View style={{
                      width: 36, alignItems: "center",
                      marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
                    }}>
                      {index < 3 ? (
                        <Text style={{ fontSize: 22 }}>{getMedalEmoji(index)}</Text>
                      ) : (
                        <Text style={{ fontSize: 15, fontWeight: "700", color: "#6B7280" }}>
                          {index + 1}
                        </Text>
                      )}
                    </View>

                    {/* Avatar */}
                    <View style={{
                      width: 38, height: 38, borderRadius: 19,
                      backgroundColor: isMe ? "#6366F1" : "#E5E7EB",
                      alignItems: "center", justifyContent: "center",
                      marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0,
                    }}>
                      <Text style={{
                        fontSize: 16, fontWeight: "700",
                        color: isMe ? "#FFFFFF" : "#374151",
                      }}>
                        {entry.displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    {/* Nom + trophées */}
                    <View style={{ flex: 1 }}>
                      <View style={{
                        flexDirection: isRTL ? "row-reverse" : "row",
                        alignItems: "center", gap: 6,
                      }}>
                        <Text style={{
                          fontSize: 14, fontWeight: isMe ? "700" : "500",
                          color: isMe ? "#6366F1" : "#111827",
                          textAlign: isRTL ? "right" : "left",
                        }}>
                          {entry.displayName}
                          {isMe ? ` (${getLabel("moi", "me", "أنا")})` : ""}
                        </Text>
                      </View>
                      {entry.trophies.length > 0 && (
                        <Text style={{ fontSize: 12, marginTop: 2 }}>
                          {entry.trophies.slice(0, 3).map((t) => t.icon).join(" ")}
                          {entry.trophies.length > 3 ? ` +${entry.trophies.length - 3}` : ""}
                        </Text>
                      )}
                    </View>

                    {/* Score + streak */}
                    <View style={{ alignItems: isRTL ? "flex-start" : "flex-end" }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#6366F1" }}>
                        {entry.totalPoints} pts
                      </Text>
                      {entry.currentStreak > 0 && (
                        <Text style={{ fontSize: 11, color: "#F59E0B", marginTop: 2 }}>
                          🔥 {entry.currentStreak}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Stats perso */}
        {stats && (
          <View style={{ marginTop: 24 }}>
            <Text style={{
              fontSize: 15, fontWeight: "700", color: "#111827",
              marginBottom: 12, textAlign: isRTL ? "right" : "left",
            }}>
              📈 {getLabel("Mes statistiques", "My Statistics", "إحصائياتي")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {[
                { label: getLabel("Quiz", "Quizzes", "اختبارات"), value: stats.totalQuizzes, icon: "🧠" },
                { label: getLabel("Parfaits", "Perfect", "مثالية"), value: stats.totalQuizPerfect, icon: "🎯" },
                { label: getLabel("Résumés", "Summaries", "ملخصات"), value: stats.totalSummaries, icon: "📄" },
                { label: getLabel("Flashcards", "Flashcards", "بطاقات"), value: stats.totalFlashcards, icon: "🃏" },
                { label: getLabel("Plans", "Plans", "خطط"), value: stats.totalPlans, icon: "📅" },
                { label: getLabel("Explications", "Explanations", "شروحات"), value: stats.totalExplanations, icon: "💡" },
              ].map((stat) => (
                <View
                  key={stat.label}
                  style={{
                    width: "30%", backgroundColor: "#FFFFFF",
                    borderRadius: 12, padding: 12, alignItems: "center",
                    borderWidth: 1, borderColor: "#F3F4F6",
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{stat.icon}</Text>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#6366F1", marginTop: 4 }}>
                    {stat.value}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, textAlign: "center" }}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}