// app/(auth)/login.tsx
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore, LANGUAGES, Language } from "@/store/languageStore";
import {
  getAuth, signInWithEmailAndPassword,
  sendEmailVerification, signOut,sendPasswordResetEmail,
} from "firebase/auth";
import app from "@/src/config/firebase";


export default function LoginScreen() {
  const params = useLocalSearchParams<{ email?: string; justRegistered?: string }>();
  const { login, isLoading, clearError } = useAuthStore();
  const { currentLanguage, setLanguage } = useLanguageStore();
  const isRTL = currentLanguage === "ar";

  const [email, setEmail] = useState(params.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showResend, setShowResend] = useState(params.justRegistered === "true");
  const [resending, setResending] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [changingLang, setChangingLang] = useState(false);

  const t = {
    title:         currentLanguage === "ar" ? "تسجيل الدخول"       : currentLanguage === "en" ? "Sign in"              : "Connexion",
    subtitle:      currentLanguage === "ar" ? "سجّل دخولك للمتابعة" : currentLanguage === "en" ? "Sign in to continue"  : "Connecte-toi pour continuer",
    emailLabel:    currentLanguage === "ar" ? "البريد الإلكتروني"   : "Email",
    emailPH:       currentLanguage === "ar" ? "بريدك@example.com"   : currentLanguage === "en" ? "your@email.com"       : "ton@email.com",
    passwordLabel: currentLanguage === "ar" ? "كلمة المرور"         : currentLanguage === "en" ? "Password"             : "Mot de passe",
    loginBtn:      currentLanguage === "ar" ? "تسجيل الدخول"        : currentLanguage === "en" ? "Sign in"              : "Se connecter",
    noAccount:     currentLanguage === "ar" ? "ليس لديك حساب؟ "     : currentLanguage === "en" ? "No account? "         : "Pas de compte ? ",
    createAccount: currentLanguage === "ar" ? "إنشاء حساب"          : currentLanguage === "en" ? "Create account"       : "Créer un compte",
    errorRequired: currentLanguage === "ar" ? "البريد الإلكتروني وكلمة المرور مطلوبان." : currentLanguage === "en" ? "Email and password are required." : "Email et mot de passe requis.",
    errorLogin:    currentLanguage === "ar" ? "فشل تسجيل الدخول. تحقق من بياناتك." : currentLanguage === "en" ? "Login failed. Check your credentials." : "Connexion échouée. Vérifie tes identifiants.",
    notVerified:   currentLanguage === "ar"
      ? "⚠️ بريدك الإلكتروني لم يتم التحقق منه بعد. تحقق من صندوق الوارد ومجلد البريد العشوائي (Spam)."
      : currentLanguage === "en"
      ? "⚠️ Your email is not verified yet. Check your inbox and your Spam or Junk folder."
      : "⚠️ Ton email n'est pas encore vérifié. Vérifie ta boîte mail et ton dossier Spam ou Courrier indésirable.",
    expiring:      currentLanguage === "ar"
      ? "⏰ تنبيه : سيتم حذف حسابك خلال 24 ساعة إذا لم يتم التحقق منه."
      : currentLanguage === "en"
      ? "⏰ Warning: Your account will be deleted within 24 hours if not verified."
      : "⏰ Attention : Ton compte sera supprimé dans 24h s'il n'est pas vérifié.",
    resendBtn:     currentLanguage === "ar" ? "إعادة إرسال بريد التحقق" : currentLanguage === "en" ? "Resend verification email" : "Renvoyer l'email de vérification",
    resendSuccess: currentLanguage === "ar" ? "تم إرسال بريد التحقق!"   : currentLanguage === "en" ? "Verification email sent!"  : "Email de vérification renvoyé !",
    resendError:   currentLanguage === "ar" ? "تعذر إرسال البريد. تحقق من بياناتك." : currentLanguage === "en" ? "Could not resend email. Check your credentials." : "Impossible de renvoyer l'email. Vérifie tes identifiants.",
    selectLang:    currentLanguage === "ar" ? "اختر اللغة" : currentLanguage === "en" ? "Select language" : "Choisir la langue",
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("", t.errorRequired);
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

  const handleLanguageChange = async (lang: Language) => {
    if (lang === currentLanguage) {
      setShowLangModal(false);
      return;
    }
    setChangingLang(true);
    setShowLangModal(false);
    try {
      await setLanguage(lang);
    } catch (e) {
      console.log("Language change error:", e);
    } finally {
      setChangingLang(false);
    }
  };

  const handleForgotPassword = async () => {
  if (!email.trim()) {
    Alert.alert("", currentLanguage === "ar" ? "أدخل بريدك الإلكتروني أولاً." : currentLanguage === "en" ? "Enter your email first." : "Entre ton email d'abord.");
    return;
  }
  try {
    const auth = getAuth(app);
    await sendPasswordResetEmail(auth, email.trim());
    Alert.alert("✅",
      currentLanguage === "ar" ? "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني."
      : currentLanguage === "en" ? "Password reset link sent to your email."
      : "Lien de réinitialisation envoyé à ton email."
    );
  } catch (e: any) {
    Alert.alert("", currentLanguage === "ar" ? "تعذر إرسال البريد. تحقق من عنوان بريدك." : currentLanguage === "en" ? "Could not send email. Check your address." : "Impossible d'envoyer l'email. Vérifie ton adresse.");
  }
};

  const currentLang = LANGUAGES.find((l) => l.code === currentLanguage);

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
          {/* Sélecteur langue */}
          <TouchableOpacity
            onPress={() => setShowLangModal(true)}
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "flex-end",
              marginBottom: 24, gap: 6,
            }}
          >
            <Text style={{ fontSize: 20 }}>{currentLang?.flag}</Text>
            <Text style={{ fontSize: 13, color: "#6B7280", fontWeight: "500" }}>
              {currentLang?.nativeLabel}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#6B7280" />
          </TouchableOpacity>

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
                fontSize: 13, color: "#92400E", marginBottom: 8, lineHeight: 20,
                textAlign: isRTL ? "right" : "left",
                writingDirection: isRTL ? "rtl" : "ltr",
              }}>
                {t.notVerified}
              </Text>

              {/* Message expiration */}
              <Text style={{
                fontSize: 12, color: "#EF4444", marginBottom: 12,
                lineHeight: 18, fontWeight: "600",
                textAlign: isRTL ? "right" : "left",
                writingDirection: isRTL ? "rtl" : "ltr",
              }}>
                {t.expiring}
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
            placeholder={t.emailPH}
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

         {/* Mot de passe oublié */}
<TouchableOpacity
  onPress={handleForgotPassword}
  style={{ alignItems: isRTL ? "flex-start" : "flex-end", marginBottom: 20 }}
>
  <Text style={{ fontSize: 13, color: "#6366F1", fontWeight: "600" }}>
    {currentLanguage === "ar" ? "نسيت كلمة المرور؟" : currentLanguage === "en" ? "Forgot password?" : "Mot de passe oublié ?"}
  </Text>
</TouchableOpacity>

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

      {/* Modal sélection langue */}
      <Modal
        visible={showLangModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLangModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "#00000050" }}
          onPress={() => setShowLangModal(false)}
          activeOpacity={1}
        >
          <View style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            backgroundColor: "#FFFFFF", borderTopLeftRadius: 20,
            borderTopRightRadius: 20, padding: 24, paddingBottom: 40,
          }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 20 }}>
              {t.selectLang}
            </Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                onPress={() => handleLanguageChange(lang.code)}
                style={{
                  flexDirection: "row", alignItems: "center", padding: 16,
                  borderRadius: 12, marginBottom: 8,
                  backgroundColor: currentLanguage === lang.code ? "#EEF2FF" : "#F8F9FA",
                  borderWidth: 1.5,
                  borderColor: currentLanguage === lang.code ? "#6366F1" : "transparent",
                }}
              >
                <Text style={{ fontSize: 28, marginRight: 14 }}>{lang.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                    {lang.nativeLabel}
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                    {lang.label}
                  </Text>
                </View>
                {currentLanguage === lang.code && (
                  <Ionicons name="checkmark-circle" size={22} color="#6366F1" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}