import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components";
import { useAuthStore } from "../../store";

const MENU_SECTIONS = [
  {
    title: "Learning",
    items: [
      { icon: "stats-chart-outline" as const, label: "My Statistics", color: "#6366f1" },
      { icon: "trophy-outline" as const, label: "Achievements", color: "#f59e0b" },
      { icon: "people-outline" as const, label: "Study Groups", color: "#10b981" },
    ],
  },
  {
    title: "App",
    items: [
      { icon: "notifications-outline" as const, label: "Notifications", color: "#ec4899" },
      { icon: "moon-outline" as const, label: "Appearance", color: "#8b5cf6" },
      { icon: "language-outline" as const, label: "Language", color: "#06b6d4" },
    ],
  },
  {
    title: "Account",
    items: [
      { icon: "shield-checkmark-outline" as const, label: "Privacy & Security", color: "#10b981" },
      { icon: "help-circle-outline" as const, label: "Help & Support", color: "#64748b" },
      { icon: "information-circle-outline" as const, label: "About StudyAI", color: "#64748b" },
    ],
  },
];

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-4 pb-10">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-8">
            <Text className="text-white text-2xl font-bold">Profile</Text>
            <TouchableOpacity className="w-10 h-10 bg-slate-800 rounded-xl items-center justify-center border border-slate-700">
              <Ionicons name="settings-outline" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Avatar card */}
          <Card className="items-center mb-6 py-8">
            <View className="w-24 h-24 bg-indigo-500 rounded-3xl items-center justify-center mb-4 shadow-lg shadow-indigo-500/40">
              <Text className="text-white text-3xl font-bold">{initials}</Text>
            </View>
            <Text className="text-white text-xl font-bold">{user?.name}</Text>
            <Text className="text-slate-400 text-sm mt-1">{user?.email}</Text>
            <View className="flex-row items-center gap-2 mt-3 bg-indigo-500/20 px-3 py-1.5 rounded-full">
              <Ionicons name="sparkles" size={14} color="#6366f1" />
              <Text className="text-indigo-400 text-xs font-semibold">
                Pro Learner
              </Text>
            </View>
          </Card>

          {/* XP / Stats bar */}
          <View className="flex-row gap-3 mb-8">
            {[
              { label: "XP Points", value: user?.totalPoints?.toLocaleString() ?? "0", icon: "star-outline" as const, color: "#f59e0b" },
              { label: "Streak", value: `${user?.studyStreak ?? 0}d`, icon: "flame-outline" as const, color: "#ef4444" },
              { label: "Rank", value: "#42", icon: "medal-outline" as const, color: "#6366f1" },
            ].map((s) => (
              <Card key={s.label} className="flex-1 items-center py-4">
                <Ionicons name={s.icon} size={20} color={s.color} />
                <Text className="text-white font-bold text-base mt-1">
                  {s.value}
                </Text>
                <Text className="text-slate-500 text-[10px] mt-0.5">
                  {s.label}
                </Text>
              </Card>
            ))}
          </View>

          {/* Menu Sections */}
          {MENU_SECTIONS.map((section) => (
            <View key={section.title} className="mb-6">
              <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3 ml-1">
                {section.title}
              </Text>
              <Card className="p-0 overflow-hidden">
                {section.items.map((item, index) => (
                  <TouchableOpacity
                    key={item.label}
                    className={`flex-row items-center gap-4 px-5 py-4 active:bg-slate-700 ${
                      index < section.items.length - 1
                        ? "border-b border-slate-700/60"
                        : ""
                    }`}
                  >
                    <View
                      className="w-9 h-9 rounded-xl items-center justify-center"
                      style={{ backgroundColor: item.color + "22" }}
                    >
                      <Ionicons name={item.icon} size={18} color={item.color} />
                    </View>
                    <Text className="text-white font-medium flex-1">
                      {item.label}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#475569"
                    />
                  </TouchableOpacity>
                ))}
              </Card>
            </View>
          ))}

          {/* Logout */}
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center justify-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl py-4 mt-2"
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text className="text-red-400 font-semibold">Sign Out</Text>
          </TouchableOpacity>

          <Text className="text-slate-600 text-xs text-center mt-6">
            StudyAI v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
