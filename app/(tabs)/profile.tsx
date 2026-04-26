// app/(tabs)/profile.tsx
import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  Alert, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore, LANGUAGES, Language } from "../../store/languageStore";
import { useTranslation } from "react-i18next";

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { currentLanguage, setLanguage } = useLanguageStore();
  const { t } = useTranslation();
  const [showLangModal, setShowLangModal] = useState(false);
  const [changingLang, setChangingLang] = useState(false);

  const displayName = user?.email?.split("@")[0] || "Étudiant";
  const currentLang = LANGUAGES.find((l) => l.code === currentLanguage);

  const handleLogout = () => {
    Alert.alert(t("logout"), t("logout_confirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("logout"), style: "destructive", onPress: logout },
    ]);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 24 }}>
          {t("profile_title")}
        </Text>

        {/* Avatar */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40, backgroundColor: "#EEF2FF",
            alignItems: "center", justifyContent: "center", marginBottom: 12,
          }}>
            <Text style={{ fontSize: 32, fontWeight: "700", color: "#6366F1" }}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>
            {displayName}
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
            {user?.email}
          </Text>
        </View>

        {/* Sélecteur de langue */}
        <View style={{
          backgroundColor: "#FFFFFF", borderRadius: 14,
          borderWidth: 1, borderColor: "#F3F4F6", marginBottom: 16, overflow: "hidden",
        }}>
          <TouchableOpacity
            onPress={() => setShowLangModal(true)}
            style={{
              flexDirection: "row", alignItems: "center", padding: 16,
              borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: "#EEF2FF" + "15",
              alignItems: "center", justifyContent: "center", marginRight: 12,
            }}>
              <Text style={{ fontSize: 18 }}>{currentLang?.flag}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 2 }}>
                {t("language")}
              </Text>
              <Text style={{ fontSize: 14, color: "#374151", fontWeight: "500" }}>
                {currentLang?.nativeLabel}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </TouchableOpacity>

          {/* Email */}
          <View style={{ flexDirection: "row", alignItems: "center", padding: 16,
            borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
            <View style={{
              width: 36, height: 36, borderRadius: 10, backgroundColor: "#6366F115",
              alignItems: "center", justifyContent: "center", marginRight: 12,
            }}>
              <Ionicons name="mail-outline" size={18} color="#6366F1" />
            </View>
            <Text style={{ fontSize: 14, color: "#374151", flex: 1 }}>
              {user?.email}
            </Text>
          </View>

          {/* Compte vérifié */}
          <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
            <View style={{
              width: 36, height: 36, borderRadius: 10, backgroundColor: "#10B98115",
              alignItems: "center", justifyContent: "center", marginRight: 12,
            }}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
            </View>
            <Text style={{ fontSize: 14, color: "#374151", flex: 1 }}>
              {t("verified_account")}
            </Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            backgroundColor: "#FEF2F2", borderRadius: 14, padding: 16,
            flexDirection: "row", alignItems: "center", justifyContent: "center",
            borderWidth: 1, borderColor: "#FECACA",
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#EF4444", marginLeft: 8 }}>
            {t("logout")}
          </Text>
        </TouchableOpacity>
      </ScrollView>

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
              {t("select_language")}
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