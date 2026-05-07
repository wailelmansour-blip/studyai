// app/_layout.tsx
import "../i18n";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useUsageStore } from "@/store/usageStore";
import { useNotificationStore } from "../store/notificationStore";
import * as Notifications from "expo-notifications";
import { useLanguageStore } from "../store/languageStore";
import { trackConversion } from "../services/analytics";
import { View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

LogBox.ignoreLogs([
  "Do not call Hooks inside useEffect",
  "React has detected a change in the order of Hooks",
  "expo-notifications",
  "Push notifications",
]);

export default function RootLayout() {
  const { user, isInitialized, initialize } = useAuthStore();
  const { loadUsage } = useUsageStore();
  const segments = useSegments();
  const { loadSettings } = useNotificationStore();
  const { currentLanguage } = useLanguageStore();

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && user.emailVerified) {
      loadUsage();
      loadSettings(currentLanguage);
      trackConversion("signup").catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!segments) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      if (user.emailVerified) {
        router.replace("/(tabs)/home");
      }
    }
  }, [user, isInitialized, segments]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/plan");
    });
    return () => sub.remove();
  }, []);

  
if (!isInitialized) {
  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FA", alignItems: "center", justifyContent: "center" }}>
      <View style={{
        width: 72, height: 72, borderRadius: 20,
        backgroundColor: "#6366F1", alignItems: "center",
        justifyContent: "center", marginBottom: 24,
      }}>
        <Ionicons name="school" size={36} color="#FFFFFF" />
      </View>
      <Text style={{ fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 8 }}>
        StudyAI
      </Text>
      <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 16 }} />
    </View>
  );
}
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="explain" />
      <Stack.Screen name="solve" />
      <Stack.Screen name="flashcards" />
      <Stack.Screen name="summary" />
      <Stack.Screen name="plan" />
      <Stack.Screen name="quiz" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="changePassword" />
    </Stack>
  );
}