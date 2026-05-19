// app/(auth)/signup.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore, LANGUAGES, Language } from "@/store/languageStore";
import { GoogleSignInButton } from "../../components/GoogleSignInButton";
import { configureGoogleSignIn, signInWithGoogle } from "../../services/googleAuth";
import { useThemeStore } from "../../store/themeStore";
import { Colors } from "../../constants/colors";

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
  if (score <= 3) return { label: labels.good,   color: "#10B981", score };
  return              { label: labels.strong, color: "#6366F1", score };
};

export default function SignupScreen() {
  const { signup, isLoading, error, clearError, lastCreatedUid } = useAuthStore();
  const { currentLanguage, setLanguage } = useLanguageStore();
  const { isDark } = useThemeStore();
  const C = isDark ? Colors.dark : Colors.light;
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
  const [googleLoading, setGoogleLoading] = useState(false);
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
    googleBtn:        currentLanguage === "ar" ? "التسجيل مع Google"                       : currentLanguage === "en" ? "Sign up with Google"              : "S'inscrire avec Google",
    googleError:      currentLanguage === "ar" ? "فشل التسجيل عبر Google. حاول مجدداً."   : currentLanguage === "en" ? "Google Sign-Up failed. Please try again." : "Inscription Google échouée. Réessaie.",
    or:               currentLanguage === "ar" ? "أو"                                      : currentLanguage === "en" ? "or"                              : "ou",
  };

  useEffect(() => { configureGoogleSignIn(); }, []);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.status === "error") Alert.alert("", t.googleError);
    } finally {
      setGoogleLoading(false);
    }
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
      await signup(email.trim(), password, firstName.trim(), lastName.trim(), birthDate.toISOString().split("T")[0], currentLanguage);
      const age = getAge(birthDate);
      if (age < 13) { setShowParentSection(true); return; }
      router.replace({ pathname: "/(auth)/login", params: { email: email.trim(), justRegistered: "true" } });
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") Alert.alert("", t.errDuplicate);
      else Alert.alert("", error || e.message || t.errFail);
    }
  };

  const handleSendParentalConsent = async () => {
    if (!parentEmail.trim() || !parentEmail.includes("@")) { Alert.alert("", t.errParentEmail); return; }
    if (!lastCreatedUid) { Alert.alert("", t.errConsentFail); return; }
    setSendingConsent(true);
    try {
      const response = await fetch(
        "https://us-central1-studyai-ab88e.cloudfunctions.net/sendParentalConsent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentEmail: parentEmail.trim(), childName: `${firstName} ${lastName}`, language: currentLanguage, uid: lastCreatedUid }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.errConsentFail);
      setConsentSent(true);
    } catch (e: any) {
      Alert.alert("", e.message || t.errConsentFail);
    } finally {
      setSendingConsent(false);
    }
  };

  // Style réutilisable pour les inputs
  const inputStyle = {
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.borderMedium,
    borderRadius: 12, padding: 14,
    fontSize: 15, color: C.text, marginBottom: 16,
  };

  const labelStyle = {
    fontSize: 14, fontWeight: "600" as const,
    color: C.text, marginBottom: 8,
    textAlign: isRTL ? "right" as const : "left" as const,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 40, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", justifyContent: "space-between", marginBottom: 24,
          }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowLangModal(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text style={{ fontSize: 20 }}>{currentLang?.flag}</Text>
              <Text style={{ fontSize: 13, color: C.textSecondary, fontWeight: "500" }}>
                {currentLang?.nativeLabel}
              </Text>
              <Ionicons name="chevron-down" size={14} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: C.text, textAlign: isRTL ? "right" : "left" }}>
              {t.title}
            </Text>
            <Text style={{ fontSize: 15, color: C.textSecondary, marginTop: 6, textAlign: isRTL ? "right" : "left" }}>
              {t.subtitle}
            </Text>
          </View>

          {/* Google */}
          <GoogleSignInButton onPress={handleGoogleSignIn} isLoading={googleLoading} label={t.googleBtn} />

          {/* Séparateur */}
          <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 20, gap: 10 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.borderMedium }} />
            <Text style={{ fontSize: 13, color: C.textTertiary }}>{t.or}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.borderMedium }} />
          </View>

          {/* Section Consentement Parental */}
          {showParentSection ? (
            <View style={{
              backgroundColor: isDark ? "#2D1B00" : "#FFFBEB",
              borderRadius: 14, padding: 20,
              borderWidth: 1, borderColor: isDark ? "#92400E" : "#FCD34D",
            }}>
              <Text style={{
                fontSize: 16, fontWeight: "700",
                color: isDark ? "#FCD34D" : "#92400E",
                marginBottom: 10, textAlign: isRTL ? "right" : "left",
              }}>
                {t.parentTitle}
              </Text>
              <Text style={{
                fontSize: 14, color: isDark ? "#FCD34D" : "#92400E",
                lineHeight: 22, marginBottom: 20, textAlign: isRTL ? "right" : "left",
              }}>
                {t.parentDesc}
              </Text>
              <Text style={labelStyle}>{t.parentEmailLabel}</Text>
              <TextInput
                value={parentEmail} onChangeText={setParentEmail}
                placeholder={t.parentEmailPH} placeholderTextColor={C.textTertiary}
                keyboardType="email-address" autoCapitalize="none"
                editable={!consentSent} textAlign={isRTL ? "right" : "left"}
                style={{ ...inputStyle, marginBottom: 16, opacity: consentSent ? 0.6 : 1 }}
              />
              {consentSent ? (
                <View>
                  <View style={{
                    backgroundColor: isDark ? "#022C22" : "#F0FDF4",
                    borderRadius: 12, padding: 14,
                    borderWidth: 1, borderColor: isDark ? "#065F46" : "#BBF7D0",
                    marginBottom: 16,
                  }}>
                    <Text style={{
                      color: isDark ? "#34D399" : "#065F46",
                      fontSize: 14, textAlign: "center", lineHeight: 20,
                    }}>
                      {t.consentSentMsg}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.replace({ pathname: "/(auth)/login", params: { email: email.trim(), justRegistered: "true" } })}
                    style={{ backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: "center" }}
                  >
                    <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>{t.continueBtn}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleSendParentalConsent}
                  disabled={sendingConsent || !parentEmail.trim()}
                  style={{
                    backgroundColor: sendingConsent || !parentEmail.trim()
                      ? (isDark ? "#3730A3" : "#A5B4FC")
                      : C.primary,
                    borderRadius: 14, padding: 16, alignItems: "center",
                  }}
                >
                  {sendingConsent ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 15 }}>{t.sendConsent}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

          ) : (
            <View>
              {/* Prénom */}
              <Text style={labelStyle}>{t.firstName}</Text>
              <TextInput
                value={firstName} onChangeText={setFirstName}
                placeholder={t.firstNamePH} placeholderTextColor={C.textTertiary}
                autoCapitalize="words" textAlign={isRTL ? "right" : "left"}
                style={inputStyle}
              />

              {/* Nom */}
              <Text style={labelStyle}>{t.lastName}</Text>
              <TextInput
                value={lastName} onChangeText={setLastName}
                placeholder={t.lastNamePH} placeholderTextColor={C.textTertiary}
                autoCapitalize="words" textAlign={isRTL ? "right" : "left"}
                style={inputStyle}
              />

              {/* Date de naissance */}
              <Text style={labelStyle}>{t.birthDate}</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={{
                  backgroundColor: C.card,
                  borderWidth: 1, borderColor: C.borderMedium,
                  borderRadius: 12, padding: 14, marginBottom: 16,
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center", justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 15, color: C.text }}>{formatDate(birthDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color={C.textTertiary} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={birthDate} mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)}
                  onChange={(_, date) => { setShowDatePicker(false); if (date) setBirthDate(date); }}
                />
              )}

              {/* Email */}
              <Text style={labelStyle}>{t.emailLabel}</Text>
              <TextInput
                value={email} onChangeText={setEmail}
                placeholder={t.emailPH} placeholderTextColor={C.textTertiary}
                keyboardType="email-address" autoCapitalize="none"
                textAlign={isRTL ? "right" : "left"} style={inputStyle}
              />

              {/* Mot de passe */}
              <Text style={labelStyle}>{t.password}</Text>
              <View style={{ position: "relative", marginBottom: 8 }}>
                <TextInput
                  value={password} onChangeText={setPassword}
                  placeholder="••••••••" placeholderTextColor={C.textTertiary}
                  secureTextEntry={!showPassword} textAlign={isRTL ? "right" : "left"}
                  style={{
                    backgroundColor: C.card,
                    borderWidth: 1, borderColor: C.borderMedium,
                    borderRadius: 12, padding: 14, paddingRight: 48,
                    fontSize: 15, color: C.text,
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 14, top: 14 }}
                >
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color={C.textTertiary} />
                </TouchableOpacity>
              </View>

              {/* Indicateur force */}
              {password.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: "row", gap: 4, marginBottom: 4 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <View key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        backgroundColor: i < strength.score ? strength.color : C.borderMedium,
                      }} />
                    ))}
                  </View>
                  <Text style={{ fontSize: 12, color: strength.color, fontWeight: "600", textAlign: isRTL ? "right" : "left" }}>
                    {t.passwordStrength} — {strength.label}
                  </Text>
                </View>
              )}

              {/* Confirmer mot de passe */}
              <Text style={labelStyle}>{t.confirm}</Text>
              <TextInput
                value={confirm} onChangeText={setConfirm}
                placeholder="••••••••" placeholderTextColor={C.textTertiary}
                secureTextEntry textAlign={isRTL ? "right" : "left"}
                style={{
                  backgroundColor: C.card,
                  borderWidth: 1,
                  borderColor: confirm.length > 0 && confirm !== password ? C.danger : C.borderMedium,
                  borderRadius: 12, padding: 14, fontSize: 15, color: C.text,
                  marginBottom: confirm.length > 0 && confirm !== password ? 4 : 28,
                }}
              />
              {confirm.length > 0 && confirm !== password && (
                <Text style={{ fontSize: 12, color: C.danger, marginBottom: 24, textAlign: isRTL ? "right" : "left" }}>
                  {t.passwordMismatch}
                </Text>
              )}

              {/* Bouton Créer compte */}
              <TouchableOpacity
                onPress={handleSignup} disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? (isDark ? "#3730A3" : "#A5B4FC") : C.primary,
                  borderRadius: 14, padding: 16, alignItems: "center",
                  elevation: 4, marginBottom: 16,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>{t.createBtn}</Text>
                )}
              </TouchableOpacity>

              {/* Lien login */}
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ alignItems: "center", padding: 8, marginTop: 16 }}
              >
                <Text style={{ fontSize: 14, color: C.textSecondary }}>
                  {t.alreadyAccount}
                  <Text style={{ color: C.primary, fontWeight: "600" }}>{t.signIn}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal sélection langue */}
      <Modal
        visible={showLangModal} transparent animationType="slide"
        onRequestClose={() => setShowLangModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: C.overlay }}
          onPress={() => setShowLangModal(false)} activeOpacity={1}
        >
          <View style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            backgroundColor: C.card,
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            padding: 24, paddingBottom: 40,
          }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 20 }}>
              {t.selectLang}
            </Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code} onPress={() => handleLanguageChange(lang.code)}
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center", padding: 16,
                  borderRadius: 12, marginBottom: 8,
                  backgroundColor: currentLanguage === lang.code ? C.primaryLight : C.background,
                  borderWidth: 1.5,
                  borderColor: currentLanguage === lang.code ? C.primary : "transparent",
                }}
              >
                <Text style={{ fontSize: 28, marginRight: isRTL ? 0 : 14, marginLeft: isRTL ? 14 : 0 }}>
                  {lang.flag}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: C.text, textAlign: isRTL ? "right" : "left" }}>
                    {lang.nativeLabel}
                  </Text>
                  <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
                    {lang.label}
                  </Text>
                </View>
                {currentLanguage === lang.code && (
                  <Ionicons name="checkmark-circle" size={22} color={C.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}