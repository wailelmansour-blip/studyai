import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card, ProgressBar } from "../../components";
import { useStudyStore } from "../../store";

export const StudyScreen: React.FC = () => {
  const { subjects, setActiveSubject } = useStudyStore();
  const [selectedFilter, setSelectedFilter] = useState("All");

  const filters = ["All", "In Progress", "Completed"];

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-4 pb-8">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-white text-2xl font-bold">Study</Text>
            <Text className="text-slate-400 text-sm mt-1">
              Choose a subject to start learning
            </Text>
          </View>

          {/* AI Study Assistant Banner */}
          <TouchableOpacity className="mb-6">
            <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-500/50">
              <View className="flex-row items-center gap-4">
                <View className="w-14 h-14 bg-white/20 rounded-2xl items-center justify-center">
                  <Ionicons name="sparkles" size={28} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-base">
                    AI Study Assistant
                  </Text>
                  <Text className="text-indigo-200 text-xs mt-0.5">
                    Generate flashcards & summaries from any topic
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#a5b4fc" />
              </View>
            </Card>
          </TouchableOpacity>

          {/* Filters */}
          <View className="flex-row gap-2 mb-6">
            {filters.map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setSelectedFilter(f)}
                className={`px-4 py-2 rounded-xl border ${
                  selectedFilter === f
                    ? "bg-indigo-500 border-indigo-500"
                    : "bg-slate-800 border-slate-700"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedFilter === f ? "text-white" : "text-slate-400"
                  }`}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Subject Cards */}
          <View className="gap-4">
            {subjects.map((subject) => (
              <TouchableOpacity
                key={subject.id}
                onPress={() => setActiveSubject(subject)}
                activeOpacity={0.8}
              >
                <Card>
                  <View className="flex-row items-start justify-between mb-4">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View
                        className="w-12 h-12 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: subject.color + "22" }}
                      >
                        <View
                          className="w-5 h-5 rounded-lg"
                          style={{ backgroundColor: subject.color }}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-bold text-base">
                          {subject.name}
                        </Text>
                        <Text className="text-slate-400 text-xs mt-0.5">
                          {subject.totalCards} flashcards
                        </Text>
                      </View>
                    </View>
                    <View
                      className="px-3 py-1 rounded-full"
                      style={{ backgroundColor: subject.color + "22" }}
                    >
                      <Text
                        className="text-xs font-bold"
                        style={{ color: subject.color }}
                      >
                        {subject.progress}%
                      </Text>
                    </View>
                  </View>

                  <ProgressBar
                    progress={subject.progress}
                    color={subject.color}
                    height={6}
                  />

                  <View className="flex-row gap-2 mt-4">
                    <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-slate-700 rounded-xl py-2.5 gap-2">
                      <Ionicons name="flash-outline" size={16} color="#94a3b8" />
                      <Text className="text-slate-300 text-sm font-medium">
                        Flashcards
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 flex-row items-center justify-center rounded-xl py-2.5 gap-2"
                      style={{ backgroundColor: subject.color + "22" }}
                    >
                      <Ionicons name="play-outline" size={16} color={subject.color} />
                      <Text
                        className="text-sm font-medium"
                        style={{ color: subject.color }}
                      >
                        Continue
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>

          {/* Add Subject */}
          <TouchableOpacity className="mt-4 border-2 border-dashed border-slate-700 rounded-3xl p-5 items-center gap-2">
            <View className="w-12 h-12 bg-slate-800 rounded-2xl items-center justify-center">
              <Ionicons name="add" size={24} color="#6366f1" />
            </View>
            <Text className="text-slate-400 text-sm font-medium">
              Add New Subject
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
