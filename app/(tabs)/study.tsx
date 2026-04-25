// app/(tabs)/study.tsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const STUDY_TOOLS = [
  { title: "Résumé IA",      sub: "Résume un document",       icon: "document-text-outline" as const, color: "#6366F1", bg: "#EEF2FF", route: "/summary" },
  { title: "Expliquer",      sub: "Comprends un texte",        icon: "bulb-outline" as const,          color: "#8B5CF6", bg: "#F5F3FF", route: "/explain" },
  { title: "Résoudre",       sub: "Résous un exercice",        icon: "calculator-outline" as const,    color: "#EF4444", bg: "#FEF2F2", route: "/solve" },
  { title: "Flashcards",     sub: "Crée des cartes mémoire",   icon: "layers-outline" as const,        color: "#06B6D4", bg: "#ECFEFF", route: "/flashcards" },
];

export default function StudyScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 6 }}>
          Étudier
        </Text>
        <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
          Choisis un outil IA pour t'aider
        </Text>

        {STUDY_TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.route}
            onPress={() => router.push(tool.route as any)}
            style={{
              backgroundColor: "#FFFFFF", borderRadius: 14, padding: 18,
              flexDirection: "row", alignItems: "center",
              borderWidth: 1, borderColor: "#F3F4F6", marginBottom: 12, elevation: 2,
            }}
          >
            <View style={{
              width: 48, height: 48, borderRadius: 14, backgroundColor: tool.bg,
              alignItems: "center", justifyContent: "center", marginRight: 16,
            }}>
              <Ionicons name={tool.icon} size={24} color={tool.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
                {tool.title}
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                {tool.sub}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}