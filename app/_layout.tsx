// app/_layout.tsx
import "../i18n";
import { useEffect } from "react";
import { Stack, router, useSegments } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useUsageStore } from "@/store/usageStore";
import { useNotificationStore } from "../store/notificationStore";
import * as Notifications from "expo-notifications";
import { useLanguageStore } from "../store/languageStore";
import { trackConversion } from "../services/analytics";

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
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      if (user.emailVerified) {
        router.replace("/(tabs)/home");
      }
      // email non vérifié → ne rien faire, signup gère la redirection
    }
  }, [user, isInitialized, segments]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/plan");
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