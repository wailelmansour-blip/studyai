// app/(tabs)/profile.tsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const displayName = user?.email?.split("@")[0] || "Étudiant";

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Tu veux vraiment te déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnexion", style: "destructive", onPress: logout },
    ]);
  };

  const menuItems = [
    { icon: "mail-outline" as const,             label: user?.email || "Email",   color: "#6366F1" },
    { icon: "shield-checkmark-outline" as const, label: "Compte vérifié",          color: "#10B981" },
    { icon: "time-outline" as const,             label: "Historique des sessions", color: "#F59E0B" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 24 }}>
          Profil
        </Text>

        {/* Avatar */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40, backgroundColor: "#EEF2FF",
            alignItems: "center", justifyContent: "center", marginBottom: 12,
          }}>
            <Text style={{ fontSize: 32, fontWeight: "700", color: "#6366F1" }}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>
            {displayName}
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
            {user?.email}
          </Text>
        </View>

        {/* Menu */}
        <View style={{
          backgroundColor: "#FFFFFF", borderRadius: 14,
          borderWidth: 1, borderColor: "#F3F4F6", marginBottom: 16, overflow: "hidden",
        }}>
          {menuItems.map((item, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row", alignItems: "center", padding: 16,
                borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: item.color + "15",
                alignItems: "center", justifyContent: "center", marginRight: 12,
              }}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={{ fontSize: 14, color: "#374151", flex: 1 }}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            backgroundColor: "#FEF2F2", borderRadius: 14, padding: 16,
            flexDirection: "row", alignItems: "center", justifyContent: "center",
            borderWidth: 1, borderColor: "#FECACA",
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#EF4444", marginLeft: 8 }}>
            Se déconnecter
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}