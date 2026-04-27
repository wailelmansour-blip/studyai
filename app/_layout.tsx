// app/_layout.tsx
import "../i18n";
import { useEffect } from "react";
import { Stack, router, useSegments } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useUsageStore } from "@/store/usageStore"; // ← AJOUT Phase 14
import { useNotificationStore } from "../store/notificationStore";
import * as Notifications from "expo-notifications";
import { useLanguageStore } from "../store/languageStore";

export default function RootLayout() {
  const { user, isInitialized, initialize } = useAuthStore();
  const { loadUsage } = useUsageStore(); // ← AJOUT Phase 14
  const segments = useSegments();
  const { loadSettings } = useNotificationStore();
  const { currentLanguage } = useLanguageStore();

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, []);

  // ← AJOUT Phase 14 : charge l'usage dès que l'user est connecté
  useEffect(() => {
    if (user) loadUsage();
  }, [user]);

  useEffect(() => {
    if (!isInitialized) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)/home");
    }
  }, [user, isInitialized, segments]);

  useEffect(() => {
  if (user) {
    loadSettings(currentLanguage); // ← charge et replanifie les notifs
  }
}, [user]);


useEffect(() => {
  const sub = Notifications.addNotificationResponseReceivedListener(() => {
    router.push("/(tabs)/planning"); // ouvre l'onglet planning au clic
  });
  return () => sub.remove();
}, []);

  if (!isInitialized) return null;

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
    </Stack>
  );
}