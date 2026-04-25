import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components";

const QUIZ_MODES = [
  {
    id: "quick",
    title: "Quick Quiz",
    description: "10 questions · ~5 mins",
    icon: "flash-outline" as const,
    color: "#6366f1",
    badge: "Popular",
  },
  {
    id: "deep",
    title: "Deep Dive",
    description: "30 questions · ~15 mins",
    icon: "layers-outline" as const,
    color: "#ec4899",
    badge: null,
  },
  {
    id: "ai",
    title: "AI Generated",
    description: "Custom topic · Any length",
    icon: "sparkles-outline" as const,
    color: "#10b981",
    badge: "New",
  },
  {
    id: "challenge",
    title: "Daily Challenge",
    description: "Compete with friends",
    icon: "trophy-outline" as const,
    color: "#f59e0b",
    badge: null,
  },
];

const RECENT_SCORES = [
  { subject: "Mathematics", score: 85, date: "Today", color: "#6366f1" },
  { subject: "Physics", score: 72, date: "Yesterday", color: "#ec4899" },
  { subject: "Chemistry", score: 91, date: "2 days ago", color: "#10b981" },
];

export const QuizScreen: React.FC = () => {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-4 pb-8">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-white text-2xl font-bold">Quiz</Text>
            <Text className="text-slate-400 text-sm mt-1">
              Test your knowledge
            </Text>
          </View>

          {/* Stats row */}
          <View className="flex-row gap-3 mb-6">
            {[
              { label: "Quizzes Done", value: "24", icon: "checkmark-circle-outline" as const, color: "#10b981" },
              { label: "Avg Score", value: "82%", icon: "stats-chart-outline" as const, color: "#6366f1" },
              { label: "Best Streak", value: "7", icon: "flame-outline" as const, color: "#f59e0b" },
            ].map((stat) => (
              <Card key={stat.label} className="flex-1 items-center py-4">
                <Ionicons name={stat.icon} size={22} color={stat.color} />
                <Text className="text-white font-bold text-lg mt-1">
                  {stat.value}
                </Text>
                <Text className="text-slate-500 text-[10px] text-center mt-0.5">
                  {stat.label}
                </Text>
              </Card>
            ))}
          </View>

          {/* Quiz Modes */}
          <Text className="text-white text-lg font-bold mb-4">Choose Mode</Text>
          <View className="gap-3 mb-8">
            {QUIZ_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                onPress={() =>
                  setSelectedMode(selectedMode === mode.id ? null : mode.id)
                }
                activeOpacity={0.8}
              >
                <Card
                  className={`${
                    selectedMode === mode.id
                      ? "border-indigo-500"
                      : "border-slate-700/50"
                  }`}
                >
                  <View className="flex-row items-center gap-4">
                    <View
                      className="w-12 h-12 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: mode.color + "22" }}
                    >
                      <Ionicons name={mode.icon} size={24} color={mode.color} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-white font-bold">
                          {mode.title}
                        </Text>
                        {mode.badge && (
                          <View
                            className="px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: mode.color + "33" }}
                          >
                            <Text
                              className="text-[10px] font-bold"
                              style={{ color: mode.color }}
                            >
                              {mode.badge}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-slate-400 text-xs mt-0.5">
                        {mode.description}
                      </Text>
                    </View>
                    <View
                      className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                        selectedMode === mode.id
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-slate-600"
                      }`}
                    >
                      {selectedMode === mode.id && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>

          {/* Start Button */}
          <TouchableOpacity
            className={`py-4 rounded-2xl items-center mb-8 ${
              selectedMode ? "bg-indigo-500" : "bg-slate-700"
            }`}
            disabled={!selectedMode}
          >
            <Text
              className={`font-bold text-base ${
                selectedMode ? "text-white" : "text-slate-500"
              }`}
            >
              {selectedMode ? "Start Quiz 🚀" : "Select a mode to start"}
            </Text>
          </TouchableOpacity>

          {/* Recent Scores */}
          <Text className="text-white text-lg font-bold mb-4">
            Recent Scores
          </Text>
          <View className="gap-3">
            {RECENT_SCORES.map((score) => (
              <Card key={score.subject}>
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: score.color + "22" }}
                  >
                    <Ionicons name="school-outline" size={18} color={score.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold">
                      {score.subject}
                    </Text>
                    <Text className="text-slate-400 text-xs">{score.date}</Text>
                  </View>
                  <View className="items-end">
                    <Text
                      className="text-lg font-bold"
                      style={{
                        color:
                          score.score >= 80
                            ? "#10b981"
                            : score.score >= 60
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    >
                      {score.score}%
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
