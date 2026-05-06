// app/changePassword.tsx
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLanguageStore } from "@/store/languageStore";
import {
  getAuth, signInWithEmailAndPassword,
  updatePassword, EmailAuthProvider, reauthenticateWithCredential,
} from "firebase/auth";
import app from "@/src/config/firebase";

export default function ChangePasswordScreen() {
  const { currentLanguage } = useLanguageStore();
  const isRTL = currentLanguage === "ar";

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = {
    title:       currentLanguage === "ar" ? "تغيير كلمة المرور"        : currentLanguage === "en" ? "Change Password"           : "Modifier le mot de passe",
    oldPassword: currentLanguage === "ar" ? "كلمة المرور الحالية"      : currentLanguage === "en" ? "Current password"          : "Mot de passe actuel",
    newPassword: currentLanguage === "ar" ? "كلمة المرور الجديدة"      : currentLanguage === "en" ? "New password"              : "Nouveau mot de passe",
    confirm:     currentLanguage === "ar" ? "تأكيد كلمة المرور الجديدة": currentLanguage === "en" ? "Confirm new password"      : "Confirmer le nouveau mot de passe",
    saveBtn:     currentLanguage === "ar" ? "تغيير كلمة المرور"        : currentLanguage === "en" ? "Change password"           : "Modifier le mot de passe",
    success:     currentLanguage === "ar" ? "تم تغيير كلمة المرور بنجاح!" : currentLanguage === "en" ? "Password changed successfully!" : "Mot de passe modifié avec succès !",
    errEmpty:    currentLanguage === "ar" ? "يرجى ملء جميع الحقول."   : currentLanguage === "en" ? "Please fill all fields."   : "Veuillez remplir tous les champs.",
    errMatch:    currentLanguage === "ar" ? "كلمتا المرور غير متطابقتين." : currentLanguage === "en" ? "Passwords do not match." : "Les mots de passe ne correspondent pas.",
    errMin:      currentLanguage === "ar" ? "6 أحرف على الأقل."        : currentLanguage === "en" ? "Minimum 6 characters."    : "Minimum 6 caractères.",
    errWrong:    currentLanguage === "ar" ? "كلمة المرور الحالية غير صحيحة." : currentLanguage === "en" ? "Current password is incorrect." : "Mot de passe actuel incorrect.",
    errFail:     currentLanguage === "ar" ? "فشل تغيير كلمة المرور."   : currentLanguage === "en" ? "Failed to change password." : "Échec de la modification.",
  };

  const handleChangePassword = async () => {
    if (!oldPassword.trim() || !newPassword.trim() || !confirm.trim()) {
      Alert.alert("", t.errEmpty); return;
    }
    if (newPassword !== confirm) {
      Alert.alert("", t.errMatch); return;
    }
    if (newPassword.length < 6) {
      Alert.alert("", t.errMin); return;
    }

    setLoading(true);
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error(t.errFail);

      // Ré-authentifier avec l'ancien mot de passe
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);

      // Mettre à jour le mot de passe
      await updatePassword(user, newPassword);

      Alert.alert("✅", t.success, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        Alert.alert("", t.errWrong);
      } else {
        Alert.alert("", e.message || t.errFail);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", marginBottom: 32, gap: 12,
          }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>
              {t.title}
            </Text>
          </View>

          {/* Ancien mot de passe */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
            {t.oldPassword}
          </Text>
          <View style={{ position: "relative", marginBottom: 20 }}>
            <TextInput
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showOld}
              textAlign={isRTL ? "right" : "left"}
              style={{
                backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
                borderRadius: 12, padding: 14, paddingRight: 48,
                fontSize: 15, color: "#111827",
              }}
            />
            <TouchableOpacity
              onPress={() => setShowOld(!showOld)}
              style={{ position: "absolute", right: 14, top: 14 }}
            >
              <Ionicons name={showOld ? "eye-off-outline" : "eye-outline"} size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Nouveau mot de passe */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
            {t.newPassword}
          </Text>
          <View style={{ position: "relative", marginBottom: 20 }}>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showNew}
              textAlign={isRTL ? "right" : "left"}
              style={{
                backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
                borderRadius: 12, padding: 14, paddingRight: 48,
                fontSize: 15, color: "#111827",
              }}
            />
            <TouchableOpacity
              onPress={() => setShowNew(!showNew)}
              style={{ position: "absolute", right: 14, top: 14 }}
            >
              <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

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
              borderColor: confirm.length > 0 && confirm !== newPassword ? "#EF4444" : "#E5E7EB",
              borderRadius: 12, padding: 14, fontSize: 15, color: "#111827",
              marginBottom: confirm.length > 0 && confirm !== newPassword ? 4 : 32,
            }}
          />
          {confirm.length > 0 && confirm !== newPassword && (
            <Text style={{ fontSize: 12, color: "#EF4444", marginBottom: 28, textAlign: isRTL ? "right" : "left" }}>
              {t.errMatch}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={loading}
            style={{
              backgroundColor: loading ? "#A5B4FC" : "#6366F1",
              borderRadius: 14, padding: 16, alignItems: "center", elevation: 4,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
                {t.saveBtn}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}