// app/_layout.tsx
import "../i18n";
import { useEffect, useState } from "react";
import { LogBox, View, Text, ActivityIndicator, Appearance } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useUsageStore } from "@/store/usageStore";
import { useNotificationStore } from "../store/notificationStore";
import * as Notifications from "expo-notifications";
import { useLanguageStore } from "../store/languageStore";
import { trackConversion } from "../services/analytics";
import { Ionicons } from "@expo/vector-icons";
import { OfflineBanner } from "../components/OfflineBanner";
import { useOnboardingStore } from "../store/onboardingStore";
import { useThemeStore } from "../store/themeStore";
import { Colors } from "../constants/colors";
import { usePurchaseStore } from "../store/purchaseStore";

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
  const { onboardingDone, checkOnboarding } = useOnboardingStore();
  const { isDark, syncWithSystem } = useThemeStore();

  const C = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, []);

  useEffect(() => {
    checkOnboarding();
  }, []);

  // Écouter les changements système
  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      syncWithSystem();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (user && user.emailVerified) {
      loadUsage();
      loadSettings(currentLanguage);
      trackConversion("signup").catch(() => {});
      // Initialiser RevenueCat
    usePurchaseStore.getState().initialize(user.uid);
    }
  }, [user]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!segments) return;
    if (onboardingDone === null) return;
    if (segments[0] === "onboarding") return;

    if (!onboardingDone) {
      router.replace("/onboarding" as any);
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      if (user.emailVerified) {
        router.replace("/(tabs)/home");
      }
    }
  }, [user, isInitialized, segments, onboardingDone]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/plan");
    });
    return () => sub.remove();
  }, []);

  if (!isInitialized || onboardingDone === null) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: "center", justifyContent: "center" }}>
        <View style={{
          width: 72, height: 72, borderRadius: 20,
          backgroundColor: C.primary, alignItems: "center",
          justifyContent: "center", marginBottom: 24,
        }}>
          <Ionicons name="school" size={36} color="#FFFFFF" />
        </View>
        <Text style={{ fontSize: 28, fontWeight: "800", color: C.text, marginBottom: 8 }}>
          StudyAI
        </Text>
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
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
        <Stack.Screen name="about" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="ranking-rules" />
        <Stack.Screen name="leaderboard" />
        <Stack.Screen name="personal-info" />
        <Stack.Screen name="notification-settings" />
        <Stack.Screen name="history-settings" />
        <Stack.Screen name="premium" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}