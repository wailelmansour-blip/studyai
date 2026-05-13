// app/(tabs)/profile.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  Alert, Modal, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore, LANGUAGES, Language } from "../../store/languageStore";
import { useTranslation } from "react-i18next";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { router } from "expo-router";
import { useUsageStore } from "../../store/usageStore";
import { LIMITS, FILE_LIMITS } from "../../types/usage";

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { currentLanguage, setLanguage } = useLanguageStore();
  const { t } = useTranslation();
  const isRTL = currentLanguage === "ar";
  const { usage } = useUsageStore();

  const [showLangModal, setShowLangModal] = useState(false);
  const [changingLang, setChangingLang] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [totalSummaries, setTotalSummaries] = useState(0);
  const [totalSolutions, setTotalSolutions] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const functions = getFunctions(getApp(), "us-central1");
  const db = getFirestore(getApp());
  const currentLang = LANGUAGES.find((l) => l.code === currentLanguage);

  const getLabel = (fr: string, en: string, ar: string) =>
    currentLanguage === "ar" ? ar : currentLanguage === "en" ? en : fr;

  const isPremium = usage?.plan === "premium";
  const usageCount = usage?.count || 0;
  const usageLimit = usage ? LIMITS[usage.plan] : LIMITS.free;
  const fileCount = usage?.fileCount || 0;
  const fileLimit = usage ? FILE_LIMITS[usage.plan] : FILE_LIMITS.free;
  const usagePercent = Math.min(100, (usageCount / usageLimit) * 100);
  const filePercent = Math.min(100, (fileCount / fileLimit) * 100);
  const displayName = firstName || user?.email?.split("@")[0] || "Étudiant";

  useEffect(() => {
    loadProfile();
    loadStats();
  }, []);

  const loadProfile = async () => {
    if (!user) return;
    setLoadingProfile(true);
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setAge(data.age || null);
      }
    } catch (e) {
      console.log("loadProfile error:", e);
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;
    setLoadingStats(true);
    try {
      const collections = [
        { name: "quizzes", setter: setTotalQuizzes },
        { name: "summaries", setter: setTotalSummaries },
        { name: "solutions", setter: setTotalSolutions },
      ];
      for (const col of collections) {
        const snap = await getDocs(
          query(collection(db, col.name), where("userId", "==", user.uid))
        );
        col.setter(snap.size);
      }
    } catch (e) {
      console.log("loadStats error:", e);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t("logout"), t("logout_confirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("logout"), style: "destructive", onPress: logout },
    ]);
  };

  const handleLanguageChange = async (lang: Language) => {
    if (lang === currentLanguage) { setShowLangModal(false); return; }
    setChangingLang(true);
    setShowLangModal(false);
    try { await setLanguage(lang); } catch (e) { console.log(e); } finally { setChangingLang(false); }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      getLabel("Supprimer le compte", "Delete Account", "حذف الحساب"),
      getLabel("Cette action est irréversible. Toutes vos données seront définitivement supprimées.", "This action cannot be undone. All your data will be permanently deleted.", "هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك نهائياً."),
      [
        { text: getLabel("Annuler", "Cancel", "إلغاء"), style: "cancel" },
        { text: getLabel("Supprimer définitivement", "Delete permanently", "حذف نهائياً"), style: "destructive", onPress: confirmDeleteAccount },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const fn = httpsCallable(functions, "deleteAccount");
      await fn({});
      await logout();
    } catch (e: any) {
      Alert.alert(getLabel("Erreur", "Error", "خطأ"), e.message || getLabel("Échec de la suppression du compte", "Failed to delete account", "فشل حذف الحساب"));
    } finally {
      setDeletingAccount(false);
    }
  };

  const menuItems = [
    {
      icon: "person-outline",
      bg: "#EEF2FF",
      color: "#6366F1",
      label: getLabel("Informations personnelles", "Personal Information", "المعلومات الشخصية"),
      onPress: () => router.push("/personal-info" as any),
    },
    {
      icon: "notifications-outline",
      bg: "#F0FDF4",
      color: "#10B981",
      label: getLabel("Notifications", "Notifications", "الإشعارات"),
      onPress: () => router.push("/notification-settings" as any),
    },
    {
      icon: "time-outline",
      bg: "#FEF3C7",
      color: "#F59E0B",
      label: getLabel("Historique & Sauvegardes", "History & Saved", "السجل والمحفوظات"),
      onPress: () => router.push("/history-settings" as any),
    },
    {
      icon: "trophy-outline",
      bg: "#FEF3C7",
      color: "#F59E0B",
      label: getLabel("Classement & Trophées", "Leaderboard & Trophies", "التصنيف والجوائز"),
      onPress: () => router.push("/leaderboard" as any),
    },
    {
      icon: "information-circle-outline",
      bg: "#EEF2FF",
      color: "#6366F1",
      label: getLabel("À propos de StudyAI", "About StudyAI", "حول StudyAI"),
      onPress: () => router.push("/about" as any),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

        {/* Header */}
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", justifyContent: "space-between", marginBottom: 24,
        }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827" }}>
            {t("profile_title")}
          </Text>
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

        {/* Avatar + nom */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40, backgroundColor: "#EEF2FF",
            alignItems: "center", justifyContent: "center", marginBottom: 12,
          }}>
            {loadingProfile ? (
              <ActivityIndicator color="#6366F1" />
            ) : (
              <Text style={{ fontSize: 32, fontWeight: "700", color: "#6366F1" }}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>
            {firstName && lastName ? `${firstName} ${lastName}` : displayName}
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
            {user?.email}
          </Text>
          {age && (
            <Text style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>
              {age} {getLabel("ans", "years", "سنة")}
            </Text>
          )}
          <View style={{
            marginTop: 10,
            backgroundColor: isPremium ? "#FEF3C7" : "#EEF2FF",
            borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
            borderWidth: 1,
            borderColor: isPremium ? "#FCD34D" : "#C7D2FE",
          }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: isPremium ? "#92400E" : "#3730A3" }}>
              {isPremium ? "✨ PREMIUM" : getLabel("Plan Gratuit", "Free Plan", "الخطة المجانية")}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <Text style={{
          fontSize: 15, fontWeight: "700", color: "#111827",
          marginBottom: 12, textAlign: isRTL ? "right" : "left",
        }}>
          📊 {getLabel("Statistiques", "Statistics", "الإحصائيات")}
        </Text>

        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10, marginBottom: 16 }}>
          {[
            { label: getLabel("Quiz", "Quizzes", "اختبارات"), value: totalQuizzes, icon: "🧠", color: "#EC4899" },
            { label: getLabel("Résumés", "Summaries", "ملخصات"), value: totalSummaries, icon: "📄", color: "#6366F1" },
            { label: getLabel("Solutions", "Solutions", "حلول"), value: totalSolutions, icon: "✏️", color: "#10B981" },
          ].map((stat) => (
            <View key={stat.label} style={{
              flex: 1, backgroundColor: "#FFFFFF", borderRadius: 14,
              padding: 14, alignItems: "center",
              borderWidth: 1, borderColor: "#F3F4F6",
            }}>
              <Text style={{ fontSize: 22, marginBottom: 4 }}>{stat.icon}</Text>
              {loadingStats ? (
                <ActivityIndicator size="small" color={stat.color} />
              ) : (
                <Text style={{ fontSize: 22, fontWeight: "800", color: stat.color }}>
                  {stat.value}
                </Text>
              )}
              <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, textAlign: "center" }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Usage du jour */}
        <View style={{
          backgroundColor: "#FFFFFF", borderRadius: 14,
          borderWidth: 1, borderColor: "#F3F4F6", marginBottom: 16, padding: 16,
        }}>
          <Text style={{
            fontSize: 13, fontWeight: "700", color: "#6B7280",
            letterSpacing: 0.5, marginBottom: 14,
            textAlign: isRTL ? "right" : "left",
          }}>
            ⚡ {getLabel("UTILISATION DU JOUR", "TODAY'S USAGE", "الاستخدام اليومي")}
          </Text>
          <View style={{ marginBottom: 12 }}>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              justifyContent: "space-between", marginBottom: 6,
            }}>
              <Text style={{ fontSize: 13, color: "#374151", fontWeight: "500" }}>
                {getLabel("Requêtes IA", "AI Requests", "طلبات الذكاء الاصطناعي")}
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>{usageCount} / {usageLimit}</Text>
            </View>
            <View style={{ height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
              <View style={{
                height: 8, width: `${usagePercent}%`, borderRadius: 4,
                backgroundColor: usagePercent >= 100 ? "#EF4444" : isPremium ? "#F59E0B" : "#6366F1",
              }} />
            </View>
          </View>
          <View>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              justifyContent: "space-between", marginBottom: 6,
            }}>
              <Text style={{ fontSize: 13, color: "#374151", fontWeight: "500" }}>
                {getLabel("Fichiers importés", "Imported files", "الملفات المستوردة")}
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>{fileCount} / {fileLimit}</Text>
            </View>
            <View style={{ height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
              <View style={{
                height: 8, width: `${filePercent}%`, borderRadius: 4,
                backgroundColor: filePercent >= 100 ? "#EF4444" : "#10B981",
              }} />
            </View>
          </View>
        </View>

        {/* Upgrade Premium */}
        {!isPremium && (
  <TouchableOpacity
    style={{ borderRadius: 14, padding: 16, marginBottom: 16, alignItems: "center", backgroundColor: "#6366F1" }}
    onPress={() => router.push("/premium" as any)}
  >
    <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFF" }}>
      ✨ {getLabel("Passer au Premium", "Upgrade to Premium", "الترقية إلى Premium")}
    </Text>
    <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
      {getLabel(
        `${LIMITS.premium} requêtes · ${FILE_LIMITS.premium} fichiers par jour`,
        `${LIMITS.premium} requests · ${FILE_LIMITS.premium} files per day`,
        `${LIMITS.premium} طلب · ${FILE_LIMITS.premium} ملف يومياً`
      )}
    </Text>
  </TouchableOpacity>
)}

        {/* Menu items */}
        <View style={{
          backgroundColor: "#FFFFFF", borderRadius: 14,
          borderWidth: 1, borderColor: "#F3F4F6",
          marginBottom: 16, overflow: "hidden",
        }}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={item.onPress}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center", padding: 16,
                borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: item.bg,
                alignItems: "center", justifyContent: "center",
                marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
              }}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, color: "#374151", fontWeight: "500", textAlign: isRTL ? "right" : "left" }}>
                {item.label}
              </Text>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            backgroundColor: "#FEF2F2", borderRadius: 14, padding: 16,
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", justifyContent: "center",
            borderWidth: 1, borderColor: "#FECACA", marginBottom: 12,
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#EF4444", marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}>
            {t("logout")}
          </Text>
        </TouchableOpacity>

        {/* Supprimer compte */}
        <TouchableOpacity
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
          style={{
            borderRadius: 14, padding: 16,
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", justifyContent: "center",
            borderWidth: 1, borderColor: "#FECACA",
            opacity: deletingAccount ? 0.6 : 1,
          }}
        >
          {deletingAccount ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#EF4444", marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}>
                {getLabel("Supprimer mon compte", "Delete my account", "حذف الحساب نهائياً")}
              </Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Modal langue */}
      <Modal visible={showLangModal} transparent animationType="slide" onRequestClose={() => setShowLangModal(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "#00000050" }} onPress={() => setShowLangModal(false)} activeOpacity={1}>
          <View style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            backgroundColor: "#FFFFFF", borderTopLeftRadius: 20,
            borderTopRightRadius: 20, padding: 24, paddingBottom: 40,
          }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 20, textAlign: isRTL ? "right" : "left" }}>
              {t("select_language")}
            </Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                onPress={() => handleLanguageChange(lang.code)}
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center", padding: 16,
                  borderRadius: 12, marginBottom: 8,
                  backgroundColor: currentLanguage === lang.code ? "#EEF2FF" : "#F8F9FA",
                  borderWidth: 1.5,
                  borderColor: currentLanguage === lang.code ? "#6366F1" : "transparent",
                }}
              >
                <Text style={{ fontSize: 28, marginRight: isRTL ? 0 : 14, marginLeft: isRTL ? 14 : 0 }}>{lang.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827", textAlign: isRTL ? "right" : "left" }}>
                    {lang.nativeLabel}
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
                    {lang.label}
                  </Text>
                </View>
                {currentLanguage === lang.code && <Ionicons name="checkmark-circle" size={22} color="#6366F1" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}