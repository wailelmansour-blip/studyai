// app/(auth)/login.tsx
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import {
  getAuth, signInWithEmailAndPassword,
  sendEmailVerification, signOut,
} from "firebase/auth";
import app from "@/src/config/firebase";
import { useLocalSearchParams } from "expo-router";

export default function LoginScreen() {
  const params = useLocalSearchParams<{ email?: string; justRegistered?: string }>();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState(params.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showResend, setShowResend] = useState(params.justRegistered === "true");
  const [resending, setResending] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Erreur", "Email et mot de passe requis.");
      return;
    }
    clearError();
    setShowResend(false);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      if (e.message === "email_not_verified") {
        setShowResend(true);
      } else {
        Alert.alert("Connexion échouée", "Vérifie tes identifiants.");
      }
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const auth = getAuth(app);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(cred.user);
      await signOut(auth);
      Alert.alert("✅", "Email de vérification renvoyé !");
    } catch (e: any) {
      Alert.alert("Erreur", "Impossible de renvoyer l'email. Vérifie tes identifiants.");
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 20,
              backgroundColor: "#6366F1", alignItems: "center",
              justifyContent: "center", marginBottom: 16,
            }}>
              <Ionicons name="school" size={36} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827" }}>
              StudyAI
            </Text>
            <Text style={{ fontSize: 15, color: "#6B7280", marginTop: 6 }}>
              Connecte-toi pour continuer
            </Text>
          </View>

          {/* Alerte email non vérifié */}
          {showResend && (
            <View style={{
              backgroundColor: "#FFFBEB", borderRadius: 12, padding: 14,
              marginBottom: 20, borderWidth: 1, borderColor: "#FCD34D",
            }}>
              <Text style={{ fontSize: 13, color: "#92400E", marginBottom: 10, lineHeight: 20 }}>
                ⚠️ Ton email n'est pas encore vérifié. Vérifie ta boîte mail ou renvoie l'email.
              </Text>
              <TouchableOpacity
                onPress={handleResendVerification}
                disabled={resending}
                style={{
                  backgroundColor: "#F59E0B", borderRadius: 8,
                  padding: 10, alignItems: "center",
                }}
              >
                {resending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "600", fontSize: 13 }}>
                    Renvoyer l'email de vérification
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Email */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="ton@email.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            style={{
              backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
              borderRadius: 12, padding: 14, fontSize: 15, color: "#111827",
              marginBottom: 16,
            }}
          />

          {/* Password */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
            Mot de passe
          </Text>
          <View style={{ position: "relative", marginBottom: 28 }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              style={{
                backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
                borderRadius: 12, padding: 14, paddingRight: 48,
                fontSize: 15, color: "#111827",
              }}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ position: "absolute", right: 14, top: 14 }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22} color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          {/* Bouton Login */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            style={{
              backgroundColor: isLoading ? "#A5B4FC" : "#6366F1",
              borderRadius: 14, padding: 16, alignItems: "center",
              elevation: 4, marginBottom: 16,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
                Se connecter
              </Text>
            )}
          </TouchableOpacity>

          {/* Signup link */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signup")}
            style={{ alignItems: "center", padding: 8 }}
          >
            <Text style={{ fontSize: 14, color: "#6B7280" }}>
              Pas de compte ?{" "}
              <Text style={{ color: "#6366F1", fontWeight: "600" }}>
                Créer un compte
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}