import { useEffect } from "react";
import { Stack } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "../src/store/authStore";

export default function RootLayout() {
    const { initializeAuth, isInitializing } = useAuthStore();

  useEffect(() => {
        const unsubscribe = initializeAuth();
        return unsubscribe;
  }, []);

  if (isInitializing) {
        return (
                <View style={{ flex: 1, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center" }}>
                          <ActivityIndicator size="large" color="#6366f1" />
                </View>View>
              );
  }

  return (
        <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
        </Stack>Stack>
      );
}
