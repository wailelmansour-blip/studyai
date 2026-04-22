import "./global.css";
import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/navigation";
import { useAuthStore } from "./src/store";

function AppContent() {
    const { initializeAuth, isInitializing } = useAuthStore();

  useEffect(() => {
        // Lance l'ecoute Firebase et recup la session persistee
                const unsubscribe = initializeAuth();
        return unsubscribe;
  }, []);

  // Affiche un loader pendant que Firebase verifie la session
  if (isInitializing) {
        return (
                <View
                          style={{
                                      flex: 1,
                                      backgroundColor: "#0f172a",
                                      alignItems: "center",
                                      justifyContent: "center",
                          }}
                        >
                        <ActivityIndicator size="large" color="#6366f1" />
                </View>View>
              );
  }
  
    return <RootNavigator />;
}

export default function App() {
    return (
          <SafeAreaProvider>
                <StatusBar style="light" backgroundColor="#0f172a" />
                <AppContent />
          </SafeAreaProvider>SafeAreaProvider>
        );
}</View>
