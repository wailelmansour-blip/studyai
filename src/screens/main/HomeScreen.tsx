import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card, ProgressBar } from "../../components";
import { useAuthStore, useStudyStore } from "../../store";

const QUICK_ACTIONS = [
  { icon: "flash-outline" as const, label: "Flashcards", color: "#6366f1" },
  { icon: "help-circle-outline" as const, label: "Quiz", color: "#ec4899" },
  { icon: "book-outline" as const, label: "Notes", color: "#10b981" },
  { icon: "calendar-outline" as const, label: "Schedule", color: "#f59e0b" },
];

export const HomeScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { subjects } = useStudyStore();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-5 pt-4 pb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-8">
            <View>
              <Text className="text-slate-400 text-sm">{greeting()},</Text>
              <Text className="text-white text-2xl font-bold">
                {user?.name ?? "Learner"} 👋
              </Text>
            </View>
            <TouchableOpacity className="relative">
              <View className="w-11 h-11 bg-slate-800 rounded-2xl items-center justify-center border border-slate-700">
                <Ionicons name="notifications-outline" size={22} color="#94a3b8" />
              </View>
              <View className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full items-center justify-center">
                <Text className="text-white text-[9px] font-bold">3</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Streak banner */}
          <Card className="mb-6 bg-indigo-600 border-indigo-500/50">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-indigo-200 text-sm mb-1">Current streak 🔥</Text>
                <Text className="text-white text-3xl font-bold">
                  {user?.studyStreak ?? 0} days
                </Text>
                <Text className="text-indigo-200 text-xs mt-1">
                  Keep it up! You're on a roll.
                </Text>
              </View>
              <View className="w-16 h-16 bg-white/20 rounded-2xl items-center justify-center">
                <Text className="text-4xl">🔥</Text>
              </View>
            </View>
          </Card>

          {/* Quick actions */}
          <Text className="text-white text-lg font-bold mb-4">Quick Actions</Text>
          <View className="flex-row flex-wrap gap-3 mb-8">
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.label}
                className="flex-1 min-w-[40%] bg-slate-800 rounded-2xl p-4 items-center border border-slate-700/50 active:bg-slate-700"
              >
                <View
                  className="w-12 h-12 rounded-2xl items-center justify-center mb-2"
                  style={{ backgroundColor: action.color + "25" }}
                >
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text className="text-white text-sm font-medium">
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Progress */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-lg font-bold">My Subjects</Text>
            <TouchableOpacity>
              <Text className="text-indigo-400 text-sm font-medium">See all</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-3">
            {subjects.slice(0, 3).map((subject) => (
              <Card key={subject.id}>
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-3">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: subject.color + "25" }}
                    >
                      <View
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: subject.color }}
                      />
                    </View>
                    <View>
                      <Text className="text-white font-semibold">{subject.name}</Text>
                      <Text className="text-slate-400 text-xs">
                        {subject.totalCards} cards
                      </Text>
                    </View>
                  </View>
                  <Text className="text-slate-300 font-bold">{subject.progress}%</Text>
                </View>
                <ProgressBar
                  progress={subject.progress}
                  color={subject.color}
                  height={5}
                />
              </Card>
            ))}
          </View>

          {/* Points */}
          <Card className="mt-6 flex-row items-center gap-4">
            <View className="w-12 h-12 bg-yellow-500/20 rounded-2xl items-center justify-center">
              <Ionicons name="star" size={24} color="#eab308" />
            </View>
            <View className="flex-1">
              <Text className="text-slate-400 text-xs">Total XP Points</Text>
              <Text className="text-white text-xl font-bold">
                {user?.totalPoints?.toLocaleString() ?? 0}
              </Text>
            </View>
            <TouchableOpacity className="bg-indigo-500/20 rounded-xl px-3 py-2">
              <Text className="text-indigo-400 text-sm font-medium">Leaderboard</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
