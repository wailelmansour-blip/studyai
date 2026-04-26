// app/_layout.tsx
import "../i18n";
import { useEffect } from "react";
import { Stack, router, useSegments } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useUsageStore } from "@/store/usageStore"; // ← AJOUT Phase 14

export default function RootLayout() {
  const { user, isInitialized, initialize } = useAuthStore();
  const { loadUsage } = useUsageStore(); // ← AJOUT Phase 14
  const segments = useSegments();

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