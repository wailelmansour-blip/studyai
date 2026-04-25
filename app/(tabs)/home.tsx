// app/(tabs)/home.tsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";

interface FeatureCard {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  bg: string;
  route: string;
}

const FEATURES: FeatureCard[] = [
  { title: "Résumé IA",    subtitle: "Résume tes documents",    icon: "document-text-outline", color: "#6366F1", bg: "#EEF2FF", route: "/summary" },
  { title: "Quiz IA",      subtitle: "Teste tes connaissances", icon: "help-circle-outline",   color: "#F59E0B", bg: "#FFFBEB", route: "/(tabs)/quiz" },
  { title: "Plan d'étude", subtitle: "Planifie tes révisions",  icon: "calendar-outline",      color: "#10B981", bg: "#F0FDF4", route: "/plan" },
  { title: "Expliquer",    subtitle: "Comprends un texte",      icon: "bulb-outline",          color: "#8B5CF6", bg: "#F5F3FF", route: "/explain" },
  { title: "Exercices",    subtitle: "Résous étape par étape",  icon: "calculator-outline",    color: "#EF4444", bg: "#FEF2F2", route: "/solve" },
  { title: "Flashcards",   subtitle: "Mémorise rapidement",     icon: "layers-outline",        color: "#06B6D4", bg: "#ECFEFF", route: "/flashcards" },
];

export default function HomeScreen() {
  const { user, logout } = useAuthStore();
  const displayName = user?.email?.split("@")[0] || "Étudiant";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        {/* Header */}
        <View style={{
          flexDirection: "row", justifyContent: "space-between",
          alignItems: "center", marginBottom: 24,
        }}>
          <View>
            <Text style={{ fontSize: 13, color: "#6B7280" }}>Bonjour 👋</Text>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", marginTop: 2 }}>
              {displayName}
            </Text>
          </View>
          <View style={{
            width: 42, height: 42, borderRadius: 21,
            backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#6366F1" }}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Banner */}
        <View style={{
          backgroundColor: "#6366F1", borderRadius: 16, padding: 20, marginBottom: 28,
        }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 4 }}>
            StudyAI 🎓
          </Text>
          <Text style={{ fontSize: 13, color: "#C7D2FE", lineHeight: 20 }}>
            Ton assistant IA personnel pour étudier plus intelligemment
          </Text>
        </View>

        {/* Features Grid */}
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 14 }}>
          Outils IA
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
          {FEATURES.map((f) => (
            <TouchableOpacity
              key={f.route}
              onPress={() => router.push(f.route as any)}
              style={{
                width: "47%", backgroundColor: "#FFFFFF", borderRadius: 14,
                padding: 16, borderWidth: 1, borderColor: "#F3F4F6", elevation: 2,
              }}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 12, backgroundColor: f.bg,
                alignItems: "center", justifyContent: "center", marginBottom: 10,
              }}>
                <Ionicons name={f.icon} size={22} color={f.color} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 3 }}>
                {f.title}
              </Text>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>{f.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Accès rapide */}
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 14 }}>
          Accès rapide
        </Text>

        {[
          { route: "/summary",    icon: "add-outline" as const,      bg: "#EEF2FF", color: "#6366F1", title: "Nouveau résumé",           sub: "Upload un fichier et génère un résumé" },
          { route: "/plan",       icon: "calendar-outline" as const,  bg: "#F0FDF4", color: "#10B981", title: "Créer un plan d'étude",    sub: "Génère un planning personnalisé" },
          { route: "/flashcards", icon: "layers-outline" as const,    bg: "#ECFEFF", color: "#06B6D4", title: "Générer des flashcards",   sub: "Mémorise rapidement un sujet" },
        ].map((item) => (
          <TouchableOpacity
            key={item.route}
            onPress={() => router.push(item.route as any)}
            style={{
              backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16,
              flexDirection: "row", alignItems: "center",
              borderWidth: 1, borderColor: "#F3F4F6", marginBottom: 10, elevation: 1,
            }}
          >
            <View style={{
              width: 40, height: 40, borderRadius: 10, backgroundColor: item.bg,
              alignItems: "center", justifyContent: "center", marginRight: 12,
            }}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>{item.title}</Text>
              <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}