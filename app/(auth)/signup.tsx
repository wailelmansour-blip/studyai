// app/(auth)/signup.tsx
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore, LANGUAGES, Language } from "@/store/languageStore";

const getPasswordStrength = (pwd: string, lang: string): { label: string; color: string; score: number } => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = {
    weak:   lang === "ar" ? "ضعيف"  : lang === "en" ? "Weak"   : "Faible",
    medium: lang === "ar" ? "متوسط" : lang === "en" ? "Medium" : "Moyen",
    good:   lang === "ar" ? "جيد"   : lang === "en" ? "Good"   : "Bien",
    strong: lang === "ar" ? "قوي"   : lang === "en" ? "Strong" : "Fort",
  };
  if (score <= 1) return { label: labels.weak,   color: "#EF4444", score };
  if (score === 2) return { label: labels.medium, color: "#F59E0B", score };
  if (score === 3) return { label: labels.good,   color: "#10B981", score };
  return              { label: labels.strong, color: "#6366F1", score };
};

export default function SignupScreen() {
  const { signup, isLoading, error, clearError, lastCreatedUid } = useAuthStore();
  const { currentLanguage, setLanguage } = useLanguageStore();
  const isRTL = currentLanguage === "ar";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState<Date>(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [changingLang, setChangingLang] = useState(false);

  // ── Parental consent ──
  const [showParentSection, setShowParentSection] = useState(false);
  const [parentEmail, setParentEmail] = useState("");
  const [sendingConsent, setSendingConsent] = useState(false);
  const [consentSent, setConsentSent] = useState(false);

  const strength = getPasswordStrength(password, currentLanguage);
  const currentLang = LANGUAGES.find((l) => l.code === currentLanguage);

  const t = {
    title:            currentLanguage === "ar" ? "إنشاء حساب"                              : currentLanguage === "en" ? "Create account"                  : "Créer un compte",
    subtitle:         currentLanguage === "ar" ? "انضم إلى StudyAI مجاناً"                 : currentLanguage === "en" ? "Join StudyAI for free"            : "Rejoins StudyAI gratuitement",
    firstName:        currentLanguage === "ar" ? "الاسم الأول"                             : currentLanguage === "en" ? "First name"                      : "Prénom",
    firstNamePH:      currentLanguage === "ar" ? "اسمك الأول"                              : currentLanguage === "en" ? "Your first name"                  : "Ton prénom",
    lastName:         currentLanguage === "ar" ? "اسم العائلة"                             : currentLanguage === "en" ? "Last name"                       : "Nom",
    lastNamePH:       currentLanguage === "ar" ? "اسم عائلتك"                              : currentLanguage === "en" ? "Your last name"                   : "Ton nom",
    birthDate:        currentLanguage === "ar" ? "تاريخ الميلاد"                           : currentLanguage === "en" ? "Date of birth"                   : "Date de naissance",
    emailLabel:       currentLanguage === "ar" ? "البريد الإلكتروني"                       : "Email",
    emailPH:          currentLanguage === "ar" ? "بريدك@example.com"                       : currentLanguage === "en" ? "your@email.com"                   : "ton@email.com",
    password:         currentLanguage === "ar" ? "كلمة المرور"                             : currentLanguage === "en" ? "Password"                        : "Mot de passe",
    confirm:          currentLanguage === "ar" ? "تأكيد كلمة المرور"                       : currentLanguage === "en" ? "Confirm password"                 : "Confirmer le mot de passe",
    passwordMismatch: currentLanguage === "ar" ? "كلمتا المرور غير متطابقتين"              : currentLanguage === "en" ? "Passwords do not match"           : "Les mots de passe ne correspondent pas",
    passwordStrength: currentLanguage === "ar" ? "قوة كلمة المرور"                         : currentLanguage === "en" ? "Password strength"                : "Mot de passe",
    createBtn:        currentLanguage === "ar" ? "إنشاء حسابي"                             : currentLanguage === "en" ? "Create my account"                : "Créer mon compte",
    alreadyAccount:   currentLanguage === "ar" ? "هل لديك حساب؟ "                         : currentLanguage === "en" ? "Already have an account? "        : "Déjà un compte ? ",
    signIn:           currentLanguage === "ar" ? "تسجيل الدخول"                            : currentLanguage === "en" ? "Sign in"                         : "Se connecter",
    errName:          currentLanguage === "ar" ? "الاسم الأول واسم العائلة مطلوبان."       : currentLanguage === "en" ? "First and last name required."     : "Prénom et nom requis.",
    errEmail:         currentLanguage === "ar" ? "البريد الإلكتروني وكلمة المرور مطلوبان." : currentLanguage === "en" ? "Email and password required."      : "Email et mot de passe requis.",
    errMin:           currentLanguage === "ar" ? "6 أحرف على الأقل."                       : currentLanguage === "en" ? "Minimum 6 characters."            : "Minimum 6 caractères.",
    errDuplicate:     currentLanguage === "ar" ? "يوجد حساب بهذا البريد. سجّل دخولك."     : currentLanguage === "en" ? "Account already exists. Sign in."  : "Un compte existe déjà. Connecte-toi.",
    errFail:          currentLanguage === "ar" ? "فشل التسجيل. حاول مجدداً."              : currentLanguage === "en" ? "Registration failed. Try again."   : "Inscription échouée. Réessaie.",
    selectLang:       currentLanguage === "ar" ? "اختر اللغة"                              : currentLanguage === "en" ? "Select language"                  : "Choisir la langue",
    parentTitle:      currentLanguage === "ar" ? "⚠️ موافقة ولي الأمر مطلوبة"              : currentLanguage === "en" ? "⚠️ Parental consent required"       : "⚠️ Consentement parental requis",
    parentDesc:       currentLanguage === "ar" ? "نظراً لأنك أقل من 13 سنة، نحتاج موافقة ولي أمرك قبل تفعيل حسابك." : currentLanguage === "en" ? "Since you are under 13, we need your parent's approval before activating your account." : "Comme tu as moins de 13 ans, nous avons besoin de l'accord d'un parent pour activer ton compte.",
    parentEmailLabel: currentLanguage === "ar" ? "بريد ولي الأمر"                          : currentLanguage === "en" ? "Parent email"                     : "Email du parent",
    parentEmailPH:    currentLanguage === "ar" ? "بريد@parent.com"                         : currentLanguage === "en" ? "parent@email.com"                 : "parent@email.com",
    sendConsent:      currentLanguage === "ar" ? "إرسال طلب الموافقة"                      : currentLanguage === "en" ? "Send consent request"             : "Envoyer la demande de consentement",
    consentSentMsg:   currentLanguage === "ar" ? "✅ تم إرسال البريد إلى ولي الأمر! تحقق من بريده الإلكتروني." : currentLanguage === "en" ? "✅ Email sent to parent! Ask them to check their inbox." : "✅ Email envoyé au parent ! Demande-lui de vérifier sa boîte mail et son dossier Spam.",
    continueBtn:      currentLanguage === "ar" ? "متابعة إلى تسجيل الدخول"                 : currentLanguage === "en" ? "Continue to login"                : "Continuer vers la connexion",
    errParentEmail:   currentLanguage === "ar" ? "بريد ولي الأمر غير صالح."                : currentLanguage === "en" ? "Invalid parent email."            : "Email parent invalide.",
    errConsentFail:   currentLanguage === "ar" ? "فشل إرسال الطلب. حاول مجدداً."          : currentLanguage === "en" ? "Failed to send request. Try again." : "Échec de l'envoi. Réessaie.",
  };

  const formatDate = (date: Date) =>
    `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

  const getAge = (date: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
    return age;
  };

  const handleLanguageChange = async (lang: Language) => {
    if (lang === currentLanguage) { setShowLangModal(false); return; }
    setChangingLang(true);
    setShowLangModal(false);
    try { await setLanguage(lang); } catch (e) { console.log(e); } finally { setChangingLang(false); }
  };

  const handleSignup = async () => {
    if (!firstName.trim() || !lastName.trim()) { Alert.alert("", t.errName); return; }
    if (!email.trim() || !password.trim()) { Alert.alert("", t.errEmail); return; }
    if (password !== confirm) { Alert.alert("", t.passwordMismatch); return; }
    if (password.length < 6) { Alert.alert("", t.errMin); return; }

    clearError();
    try {
      await signup(
        email.trim(), password,
        firstName.trim(), lastName.trim(),
        birthDate.toISOString().split("T")[0],
        currentLanguage
      );

      const age = getAge(birthDate);
      if (age < 13) {
        setShowParentSection(true);
        return;
      }

      router.replace({
        pathname: "/(auth)/login",
        params: { email: email.trim(), justRegistered: "true" },
      });
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") {
        Alert.alert("", t.errDuplicate);
      } else {
        Alert.alert("", error || e.message || t.errFail);
      }
    }
  };

  const handleSendParentalConsent = async () => {
    if (!parentEmail.trim() || !parentEmail.includes("@")) {
      Alert.alert("", t.errParentEmail);
      return;
    }
    if (!lastCreatedUid) {
      Alert.alert("", t.errConsentFail);
      return;
    }
    setSendingConsent(true);
    try {
      const fns = getFunctions(getApp(), "us-central1");
      const fn = httpsCallable(fns, "sendParentalConsent");
      await fn({
        parentEmail: parentEmail.trim(),
        childName: `${firstName} ${lastName}`,
        language: currentLanguage,
        uid: lastCreatedUid,
      });
      setConsentSent(true);
    } catch (e: any) {
      Alert.alert("", e.message || t.errConsentFail);
    } finally {
      setSendingConsent(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 40, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header : retour + sélecteur langue */}
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", justifyContent: "space-between", marginBottom: 24,
          }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowLangModal(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text style={{ fontSize: 20 }}>{currentLang?.flag}</Text>
              <Text style={{ fontSize: 13, color: "#6B7280", fontWeight: "500" }}>
                {currentLang?.nativeLabel}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827", textAlign: isRTL ? "right" : "left" }}>
              {t.title}
            </Text>
            <Text style={{ fontSize: 15, color: "#6B7280", marginTop: 6, textAlign: isRTL ? "right" : "left" }}>
              {t.subtitle}
            </Text>
          </View>

          {/* ── Section Consentement Parental ── */}
          {showParentSection ? (
            <View style={{
              backgroundColor: "#FFFBEB", borderRadius: 14, padding: 20,
              borderWidth: 1, borderColor: "#FCD34D",
            }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#92400E", marginBottom: 10, textAlign: isRTL ? "right" : "left" }}>
                {t.parentTitle}
              </Text>
              <Text style={{ fontSize: 14, color: "#92400E", lineHeight: 22, marginBottom: 20, textAlign: isRTL ? "right" : "left" }}>
                {t.parentDesc}
              </Text>

              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
                {t.parentEmailLabel}
              </Text>
              <TextInput
                value={parentEmail}
                onChangeText={setParentEmail}
                placeholder={t.parentEmailPH}
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!consentSent}
                textAlign={isRTL ? "right" : "left"}
                style={{
                  backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
                  borderRadius: 12, padding: 14, fontSize: 15, color: "#111827",
                  marginBottom: 16, opacity: consentSent ? 0.6 : 1,
                }}
              />

              {consentSent ? (
                <View>
                  <View style={{
                    backgroundColor: "#F0FDF4", borderRadius: 12, padding: 14,
                    borderWidth: 1, borderColor: "#BBF7D0", marginBottom: 16,
                  }}>
                    <Text style={{ color: "#065F46", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
                      {t.consentSentMsg}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.replace({
                      pathname: "/(auth)/login",
                      params: { email: email.trim(), justRegistered: "true" },
                    })}
                    style={{
                      backgroundColor: "#6366F1", borderRadius: 14,
                      padding: 16, alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
                      {t.continueBtn}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleSendParentalConsent}
                  disabled={sendingConsent || !parentEmail.trim()}
                  style={{
                    backgroundColor: sendingConsent || !parentEmail.trim() ? "#A5B4FC" : "#6366F1",
                    borderRadius: 14, padding: 16, alignItems: "center",
                  }}
                >
                  {sendingConsent ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 15 }}>
                      {t.sendConsent}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

          ) : (
            <View>
              {/* Prénom */}
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
                {t.firstName}
              </Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t.firstNamePH}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                textAlign={isRTL ? "right" : "left"}
                style={{
                  backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
                  borderRadius: 12, padding: 14, fontSize: 15, color: "#111827", marginBottom: 16,
                }}
              />

              {/* Nom */}
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
                {t.lastName}
              </Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder={t.lastNamePH}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                textAlign={isRTL ? "right" : "left"}
                style={{
                  backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
                  borderRadius: 12, padding: 14, fontSize: 15, color: "#111827", marginBottom: 16,
                }}
              />

              {/* Date de naissance */}
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
                {t.birthDate}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={{
                  backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
                  borderRadius: 12, padding: 14, marginBottom: 16,
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center", justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 15, color: "#111827" }}>{formatDate(birthDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={birthDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  onChange={(_, date) => {
                    setShowDatePicker(false);
                    if (date) setBirthDate(date);
                  }}
                />
              )}

              {/* Email */}
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
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
                  borderRadius: 12, padding: 14, fontSize: 15, color: "#111827", marginBottom: 16,
                }}
              />

              {/* Mot de passe */}
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
                {t.password}
              </Text>
              <View style={{ position: "relative", marginBottom: 8 }}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  textAlign={isRTL ? "right" : "left"}
                  style={{
                    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
                    borderRadius: 12, padding: 14, paddingRight: 48, fontSize: 15, color: "#111827",
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 14, top: 14 }}
                >
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* Indicateur force */}
              {password.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: "row", gap: 4, marginBottom: 4 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <View key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        backgroundColor: i < strength.score ? strength.color : "#E5E7EB",
                      }} />
                    ))}
                  </View>
                  <Text style={{ fontSize: 12, color: strength.color, fontWeight: "600", textAlign: isRTL ? "right" : "left" }}>
                    {t.passwordStrength} — {strength.label}
                  </Text>
                </View>
              )}

              {/* Confirmer */}
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
                {t.confirm}
              </Text>
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                textAlign={isRTL ? "right" : "left"}
                style={{
                  backgroundColor: "#FFFFFF", borderWidth: 1,
                  borderColor: confirm.length > 0 && confirm !== password ? "#EF4444" : "#E5E7EB",
                  borderRadius: 12, padding: 14, fontSize: 15, color: "#111827",
                  marginBottom: confirm.length > 0 && confirm !== password ? 4 : 28,
                }}
              />
              {confirm.length > 0 && confirm !== password && (
                <Text style={{ fontSize: 12, color: "#EF4444", marginBottom: 24, textAlign: isRTL ? "right" : "left" }}>
                  {t.passwordMismatch}
                </Text>
              )}

              <TouchableOpacity
                onPress={handleSignup}
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
                    {t.createBtn}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                style={{ alignItems: "center", padding: 8 }}
              >
                <Text style={{ fontSize: 14, color: "#6B7280" }}>
                  {t.alreadyAccount}
                  <Text style={{ color: "#6366F1", fontWeight: "600" }}>{t.signIn}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
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