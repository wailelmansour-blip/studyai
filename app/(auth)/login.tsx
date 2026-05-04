// app/(auth)/login.tsx
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import {
  getAuth, signInWithEmailAndPassword,
  sendEmailVerification, signOut,
} from "firebase/auth";
import app from "@/src/config/firebase";

export default function LoginScreen() {
  const params = useLocalSearchParams<{ email?: string; justRegistered?: string }>();
  const { login, isLoading, clearError } = useAuthStore();
  const { currentLanguage } = useLanguageStore();
  const isRTL = currentLanguage === "ar";

  const [email, setEmail] = useState(params.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showResend, setShowResend] = useState(params.justRegistered === "true");
  const [resending, setResending] = useState(false);

  const t = {
    title: currentLanguage === "ar" ? "تسجيل الدخول" : currentLanguage === "en" ? "Sign in" : "Connexion",
    subtitle: currentLanguage === "ar" ? "سجّل دخولك للمتابعة" : currentLanguage === "en" ? "Sign in to continue" : "Connecte-toi pour continuer",
    emailLabel: currentLanguage === "ar" ? "البريد الإلكتروني" : "Email",
    emailPlaceholder: currentLanguage === "ar" ? "بريدك@example.com" : currentLanguage === "en" ? "your@email.com" : "ton@email.com",
    passwordLabel: currentLanguage === "ar" ? "كلمة المرور" : currentLanguage === "en" ? "Password" : "Mot de passe",
    loginBtn: currentLanguage === "ar" ? "تسجيل الدخول" : currentLanguage === "en" ? "Sign in" : "Se connecter",
    noAccount: currentLanguage === "ar" ? "ليس لديك حساب؟ " : currentLanguage === "en" ? "No account? " : "Pas de compte ? ",
    createAccount: currentLanguage === "ar" ? "إنشاء حساب" : currentLanguage === "en" ? "Create account" : "Créer un compte",
    errorRequired: currentLanguage === "ar" ? "البريد الإلكتروني وكلمة المرور مطلوبان." : currentLanguage === "en" ? "Email and password are required." : "Email et mot de passe requis.",
    errorLogin: currentLanguage === "ar" ? "فشل تسجيل الدخول. تحقق من بياناتك." : currentLanguage === "en" ? "Login failed. Check your credentials." : "Connexion échouée. Vérifie tes identifiants.",
    notVerified: currentLanguage === "ar"
      ? "⚠️ بريدك الإلكتروني لم يتم التحقق منه بعد. تحقق من صندوق الوارد ومجلد البريد العشوائي (Spam)."
      : currentLanguage === "en"
      ? "⚠️ Your email is not verified yet. Check your inbox and your Spam or Junk folder."
      : "⚠️ Ton email n'est pas encore vérifié. Vérifie ta boîte mail et ton dossier Spam ou Courrier indésirable.",
    resendBtn: currentLanguage === "ar" ? "إعادة إرسال بريد التحقق" : currentLanguage === "en" ? "Resend verification email" : "Renvoyer l'email de vérification",
    resendSuccess: currentLanguage === "ar" ? "تم إرسال بريد التحقق!" : currentLanguage === "en" ? "Verification email sent!" : "Email de vérification renvoyé !",
    resendError: currentLanguage === "ar" ? "تعذر إرسال البريد. تحقق من بياناتك." : currentLanguage === "en" ? "Could not resend email. Check your credentials." : "Impossible de renvoyer l'email. Vérifie tes identifiants.",
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Erreur", t.errorRequired);
      return;
    }
    clearError();
    setShowResend(false);
    try {
      await login(email.trim(), password, currentLanguage);
    } catch (e: any) {
      if (e.message === "email_not_verified") {
        setShowResend(true);
      } else {
        Alert.alert("", t.errorLogin);
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
      Alert.alert("✅", t.resendSuccess);
    } catch (e: any) {
      Alert.alert("", t.resendError);
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
              {t.subtitle}
            </Text>
          </View>

          {/* Alerte email non vérifié */}
          {showResend && (
            <View style={{
              backgroundColor: "#FFFBEB", borderRadius: 12, padding: 14,
              marginBottom: 20, borderWidth: 1, borderColor: "#FCD34D",
            }}>
              <Text style={{
                fontSize: 13, color: "#92400E", marginBottom: 10, lineHeight: 20,
                textAlign: isRTL ? "right" : "left",
                writingDirection: isRTL ? "rtl" : "ltr",
              }}>
                {t.notVerified}
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
                    {t.resendBtn}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Email */}
          <Text style={{
            fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8,
            textAlign: isRTL ? "right" : "left",
          }}>
            {t.emailLabel}
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t.emailPlaceholder}
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            textAlign={isRTL ? "right" : "left"}
            style={{
              backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
              borderRadius: 12, padding: 14, fontSize: 15, color: "#111827",
              marginBottom: 16,
            }}
          />

          {/* Password */}
          <Text style={{
            fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8,
            textAlign: isRTL ? "right" : "left",
          }}>
            {t.passwordLabel}
          </Text>
          <View style={{ position: "relative", marginBottom: 28 }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              textAlign={isRTL ? "right" : "left"}
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
                {t.loginBtn}
              </Text>
            )}
          </TouchableOpacity>

          {/* Signup link */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signup")}
            style={{ alignItems: "center", padding: 8 }}
          >
            <Text style={{ fontSize: 14, color: "#6B7280" }}>
              {t.noAccount}
              <Text style={{ color: "#6366F1", fontWeight: "600" }}>
                {t.createAccount}
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}