// app/(tabs)/profile.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, Modal, Switch, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore, LANGUAGES, Language } from "../../store/languageStore";
import { useTranslation } from "react-i18next";
import { useNotificationStore } from "../../store/notificationStore";
import { sendTestNotification } from "../../services/notifications";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useDeleteHistory, HistoryType } from "../../hooks/useDeleteHistory";
import { useHistoryStore } from "../../store/historyStore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { router } from "expo-router";
import { useUsageStore } from "../../store/usageStore";
import { LIMITS, FILE_LIMITS } from "../../types/usage";

export default function ProfileScreen() {
  const { user, logout, setFirstName: setStoreFirstName } = useAuthStore();
  const { currentLanguage, setLanguage } = useLanguageStore();
  const { t } = useTranslation();
  const isRTL = currentLanguage === "ar";
  const { usage } = useUsageStore();

  const [showLangModal, setShowLangModal] = useState(false);
  const [changingLang, setChangingLang] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // ── Profil utilisateur ──
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editAge, setEditAge] = useState("");

  // ── Statistiques ──
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [totalSummaries, setTotalSummaries] = useState(0);
  const [totalSolutions, setTotalSolutions] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const { confirmDeleteAll } = useDeleteHistory();
  const { triggerRefresh } = useHistoryStore();
  const functions = getFunctions(getApp(), "us-central1");
  const db = getFirestore(getApp());

  const {
    settings, hasPermission, loadSettings,
    toggleEnabled, toggleStudyReminder, togglePlanAlerts,
    setReminderTime, checkPermission,
  } = useNotificationStore();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const reminderTime = new Date();
  reminderTime.setHours(settings.studyReminderHour, settings.studyReminderMinute, 0, 0);

  useEffect(() => {
    loadSettings(currentLanguage);
    checkPermission();
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

  const handleEditProfile = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setEditAge(age?.toString() || "");
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!editFirstName.trim() || !editLastName.trim()) {
      Alert.alert("", getLabel("Prénom et nom requis.", "First and last name required.", "الاسم الأول واسم العائلة مطلوبان."));
      return;
    }
    const ageNum = parseInt(editAge);
    if (editAge && (isNaN(ageNum) || ageNum < 1 || ageNum > 120)) {
      Alert.alert("", getLabel("Âge invalide.", "Invalid age.", "عمر غير صالح."));
      return;
    }
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, "users", user!.uid), {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        age: ageNum || age,
      });
      setFirstName(editFirstName.trim());
      setStoreFirstName(editFirstName.trim());
      setLastName(editLastName.trim());
      if (ageNum) setAge(ageNum);
      setEditingProfile(false);
      Alert.alert("✅", getLabel("Profil mis à jour !", "Profile updated!", "تم تحديث الملف الشخصي!"));
    } catch (e: any) {
      Alert.alert("", e.message || getLabel("Erreur lors de la mise à jour.", "Update failed.", "فشل التحديث."));
    } finally {
      setSavingProfile(false);
    }
  };

  const displayName = firstName || user?.email?.split("@")[0] || "Étudiant";
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

  const deleteLabels = {
    title:    getLabel("Supprimer le compte",               "Delete Account",                  "حذف الحساب"),
    msg:      getLabel("Cette action est irréversible. Toutes vos données seront définitivement supprimées.", "This action cannot be undone. All your data will be permanently deleted.", "هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك نهائياً."),
    cancel:   getLabel("Annuler",                           "Cancel",                          "إلغاء"),
    confirm:  getLabel("Supprimer définitivement",          "Delete permanently",              "حذف نهائياً"),
    btn:      getLabel("Supprimer mon compte",              "Delete my account",               "حذف الحساب نهائياً"),
    error:    getLabel("Échec de la suppression du compte", "Failed to delete account",        "فشل حذف الحساب"),
    errTitle: getLabel("Erreur",                            "Error",                           "خطأ"),
  };

  const historyLabels = {
    title:    getLabel("HISTORIQUE & SAUVEGARDES", "HISTORY & SAVED",  "السجل والمحفوظات"),
    clearAll: getLabel("Tout effacer",             "Clear all",         "حذف الكل"),
  };

  const profileLabels = {
    title:      getLabel("Informations personnelles", "Personal information", "المعلومات الشخصية"),
    firstName:  getLabel("Prénom",                    "First name",           "الاسم الأول"),
    lastName:   getLabel("Nom",                       "Last name",            "اسم العائلة"),
    age:        getLabel("Âge",                       "Age",                  "العمر"),
    email:      getLabel("Email",                     "Email",                "البريد الإلكتروني"),
    emailNote:  getLabel("Non modifiable",            "Read only",            "غير قابل للتعديل"),
    edit:       getLabel("Modifier",                  "Edit",                 "تعديل"),
    save:       getLabel("Enregistrer",               "Save",                 "حفظ"),
    cancel:     getLabel("Annuler",                   "Cancel",               "إلغاء"),
    years:      getLabel("ans",                       "years",                "سنة"),
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
    Alert.alert(deleteLabels.title, deleteLabels.msg, [
      { text: deleteLabels.cancel, style: "cancel" },
      { text: deleteLabels.confirm, style: "destructive", onPress: confirmDeleteAccount },
    ]);
  };

  const confirmDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const fn = httpsCallable(functions, "deleteAccount");
      await fn({});
      await logout();
    } catch (e: any) {
      Alert.alert(deleteLabels.errTitle, e.message || deleteLabels.error);
    } finally {
      setDeletingAccount(false);
    }
  };

  const HISTORY_ITEMS: { type: HistoryType; labelFr: string; labelEn: string; labelAr: string; icon: string }[] = [
    { type: "quizzes",      labelFr: "Quiz",          labelEn: "Quizzes",      labelAr: "اختبارات",       icon: "🧠" },
    { type: "flashcards",   labelFr: "Flashcards",    labelEn: "Flashcards",   labelAr: "بطاقات",         icon: "🃏" },
    { type: "plans",        labelFr: "Plans d'étude", labelEn: "Study Plans",  labelAr: "خطط الدراسة",    icon: "📅" },
    { type: "summaries",    labelFr: "Résumés",       labelEn: "Summaries",    labelAr: "ملخصات",         icon: "📄" },
    { type: "explanations", labelFr: "Explications",  labelEn: "Explanations", labelAr: "شروحات",         icon: "💡" },
    { type: "solutions",    labelFr: "Solutions",     labelEn: "Solutions",    labelAr: "حلول",           icon: "✏️" },
    { type: "chatSessions", labelFr: "Chat IA",       labelEn: "AI Chat",      labelAr: "محادثات الذكاء", icon: "💬" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

        {/* Header : titre + sélecteur langue */}
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
              {age} {profileLabels.years}
            </Text>
          )}

          {/* Badge plan */}
          <View style={{
            marginTop: 10,
            backgroundColor: isPremium ? "#FEF3C7" : "#EEF2FF",
            borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
            borderWidth: 1,
            borderColor: isPremium ? "#FCD34D" : "#C7D2FE",
          }}>
            <Text style={{
              fontSize: 13, fontWeight: "700",
              color: isPremium ? "#92400E" : "#3730A3",
            }}>
              {isPremium
                ? "✨ PREMIUM"
                : getLabel("Plan Gratuit", "Free Plan", "الخطة المجانية")}
            </Text>
          </View>
        </View>

        {/* ── Section Statistiques ── */}
        <Text style={{
          fontSize: 15, fontWeight: "700", color: "#111827",
          marginBottom: 12, textAlign: isRTL ? "right" : "left",
        }}>
          📊 {getLabel("Statistiques", "Statistics", "الإحصائيات")}
        </Text>

        {/* Cartes stats */}
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

        {/* ── Section Usage du jour ── */}
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

          {/* Requêtes IA */}
          <View style={{ marginBottom: 12 }}>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              justifyContent: "space-between", marginBottom: 6,
            }}>
              <Text style={{ fontSize: 13, color: "#374151", fontWeight: "500" }}>
                {getLabel("Requêtes IA", "AI Requests", "طلبات الذكاء الاصطناعي")}
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                {usageCount} / {usageLimit}
              </Text>
            </View>
            <View style={{ height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
              <View style={{
                height: 8,
                width: `${usagePercent}%`,
                backgroundColor: usagePercent >= 100 ? "#EF4444" : isPremium ? "#F59E0B" : "#6366F1",
                borderRadius: 4,
              }} />
            </View>
          </View>

          {/* Fichiers */}
          <View>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              justifyContent: "space-between", marginBottom: 6,
            }}>
              <Text style={{ fontSize: 13, color: "#374151", fontWeight: "500" }}>
                {getLabel("Fichiers importés", "Imported files", "الملفات المستوردة")}
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                {fileCount} / {fileLimit}
              </Text>
            </View>
            <View style={{ height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
              <View style={{
                height: 8,
                width: `${filePercent}%`,
                backgroundColor: filePercent >= 100 ? "#EF4444" : "#10B981",
                borderRadius: 4,
              }} />
            </View>
          </View>
        </View>

        {/* ── Bouton Upgrade Premium ── */}
        {!isPremium && (
          <TouchableOpacity
            style={{
              borderRadius: 14, padding: 16, marginBottom: 16,
              alignItems: "center",
              backgroundColor: "#6366F1",
            }}
            onPress={() => Alert.alert(
              getLabel("Passer au Premium ✨", "Upgrade to Premium ✨", "الترقية إلى Premium ✨"),
              getLabel(
                `Débloquez ${LIMITS.premium} requêtes/jour et ${FILE_LIMITS.premium} fichiers/jour.\n\nContactez-nous pour plus d'informations.`,
                `Unlock ${LIMITS.premium} requests/day and ${FILE_LIMITS.premium} files/day.\n\nContact us for more information.`,
                `افتح ${LIMITS.premium} طلب/يوم و${FILE_LIMITS.premium} ملف/يوم.\n\nتواصل معنا للمزيد من المعلومات.`
              )
            )}
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

        {/* ── Section Profil ── */}
        <View style={{
          backgroundColor: "#FFFFFF", borderRadius: 14,
          borderWidth: 1, borderColor: "#F3F4F6", marginBottom: 16, overflow: "hidden",
        }}>
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", justifyContent: "space-between",
            padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
          }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 }}>
              {profileLabels.title.toUpperCase()}
            </Text>
            {!editingProfile && (
              <TouchableOpacity onPress={handleEditProfile}>
                <Text style={{ fontSize: 13, color: "#6366F1", fontWeight: "600" }}>
                  ✏️ {profileLabels.edit}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {editingProfile ? (
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 6, textAlign: isRTL ? "right" : "left" }}>
                {profileLabels.firstName}
              </Text>
              <TextInput
                value={editFirstName}
                onChangeText={setEditFirstName}
                autoCapitalize="words"
                textAlign={isRTL ? "right" : "left"}
                style={{
                  backgroundColor: "#F8F9FA", borderWidth: 1, borderColor: "#E5E7EB",
                  borderRadius: 10, padding: 12, fontSize: 15, color: "#111827", marginBottom: 12,
                }}
              />
              <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 6, textAlign: isRTL ? "right" : "left" }}>
                {profileLabels.lastName}
              </Text>
              <TextInput
                value={editLastName}
                onChangeText={setEditLastName}
                autoCapitalize="words"
                textAlign={isRTL ? "right" : "left"}
                style={{
                  backgroundColor: "#F8F9FA", borderWidth: 1, borderColor: "#E5E7EB",
                  borderRadius: 10, padding: 12, fontSize: 15, color: "#111827", marginBottom: 12,
                }}
              />
              <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 6, textAlign: isRTL ? "right" : "left" }}>
                {profileLabels.age}
              </Text>
              <TextInput
                value={editAge}
                onChangeText={setEditAge}
                keyboardType="numeric"
                maxLength={3}
                textAlign={isRTL ? "right" : "left"}
                style={{
                  backgroundColor: "#F8F9FA", borderWidth: 1, borderColor: "#E5E7EB",
                  borderRadius: 10, padding: 12, fontSize: 15, color: "#111827", marginBottom: 16,
                }}
              />
              <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 6, textAlign: isRTL ? "right" : "left" }}>
                {profileLabels.email} — <Text style={{ color: "#D1D5DB" }}>{profileLabels.emailNote}</Text>
              </Text>
              <View style={{ backgroundColor: "#F3F4F6", borderRadius: 10, padding: 12, marginBottom: 20 }}>
                <Text style={{ fontSize: 15, color: "#9CA3AF", textAlign: isRTL ? "right" : "left" }}>
                  {user?.email}
                </Text>
              </View>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setEditingProfile(false)}
                  style={{
                    flex: 1, borderRadius: 10, padding: 12, alignItems: "center",
                    backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
                  }}
                >
                  <Text style={{ fontWeight: "600", color: "#374151" }}>{profileLabels.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                  style={{
                    flex: 1, borderRadius: 10, padding: 12, alignItems: "center",
                    backgroundColor: savingProfile ? "#A5B4FC" : "#6366F1",
                  }}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={{ fontWeight: "600", color: "#FFF" }}>{profileLabels.save}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              {/* Prénom */}
              <View style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center", padding: 16,
                borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10, backgroundColor: "#EEF2FF",
                  alignItems: "center", justifyContent: "center",
                  marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
                }}>
                  <Ionicons name="person-outline" size={18} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 2, textAlign: isRTL ? "right" : "left" }}>
                    {profileLabels.firstName}
                  </Text>
                  <Text style={{ fontSize: 14, color: "#374151", fontWeight: "500", textAlign: isRTL ? "right" : "left" }}>
                    {firstName || "—"}
                  </Text>
                </View>
              </View>

              {/* Nom */}
              <View style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center", padding: 16,
                borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10, backgroundColor: "#EEF2FF",
                  alignItems: "center", justifyContent: "center",
                  marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
                }}>
                  <Ionicons name="people-outline" size={18} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 2, textAlign: isRTL ? "right" : "left" }}>
                    {profileLabels.lastName}
                  </Text>
                  <Text style={{ fontSize: 14, color: "#374151", fontWeight: "500", textAlign: isRTL ? "right" : "left" }}>
                    {lastName || "—"}
                  </Text>
                </View>
              </View>

              {/* Âge */}
              <View style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center", padding: 16,
                borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10, backgroundColor: "#EEF2FF",
                  alignItems: "center", justifyContent: "center",
                  marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
                }}>
                  <Ionicons name="calendar-number-outline" size={18} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 2, textAlign: isRTL ? "right" : "left" }}>
                    {profileLabels.age}
                  </Text>
                  <Text style={{ fontSize: 14, color: "#374151", fontWeight: "500", textAlign: isRTL ? "right" : "left" }}>
                    {age ? `${age} ${profileLabels.years}` : "—"}
                  </Text>
                </View>
              </View>

              {/* Email */}
              <View style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center", padding: 16,
                borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10, backgroundColor: "#6366F115",
                  alignItems: "center", justifyContent: "center",
                  marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
                }}>
                  <Ionicons name="mail-outline" size={18} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 2, textAlign: isRTL ? "right" : "left" }}>
                    {profileLabels.email}
                  </Text>
                  <Text style={{ fontSize: 14, color: "#374151", fontWeight: "500", textAlign: isRTL ? "right" : "left" }}>
                    {user?.email}
                  </Text>
                </View>
                <View style={{ backgroundColor: "#F3F4F6", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, color: "#9CA3AF" }}>{profileLabels.emailNote}</Text>
                </View>
              </View>

              {/* Compte vérifié */}
              <View style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center", padding: 16,
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10, backgroundColor: "#10B98115",
                  alignItems: "center", justifyContent: "center",
                  marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
                }}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
                </View>
                <Text style={{ fontSize: 14, color: "#374151", flex: 1, textAlign: isRTL ? "right" : "left" }}>
                  {t("verified_account")}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Modifier mot de passe */}
        <TouchableOpacity
          onPress={() => router.push("/changePassword")}
          style={{
            backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16,
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            borderWidth: 1, borderColor: "#F3F4F6", marginBottom: 16,
          }}
        >
          <View style={{
            width: 36, height: 36, borderRadius: 10, backgroundColor: "#EEF2FF",
            alignItems: "center", justifyContent: "center",
            marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
          }}>
            <Ionicons name="lock-closed-outline" size={18} color="#6366F1" />
          </View>
          <Text style={{ flex: 1, fontSize: 14, color: "#374151", fontWeight: "500", textAlign: isRTL ? "right" : "left" }}>
            {getLabel("Modifier le mot de passe", "Change password", "تغيير كلمة المرور")}
          </Text>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color="#D1D5DB" />
        </TouchableOpacity>

        {/* ── Section Notifications ── */}
        <Text style={{
          fontSize: 15, fontWeight: "700", color: "#111827",
          marginBottom: 10, marginTop: 8,
          textAlign: isRTL ? "right" : "left",
        }}>
          🔔 {getLabel("Notifications", "Notifications", "الإشعارات")}
        </Text>

        {!hasPermission && (
          <TouchableOpacity
            onPress={checkPermission}
            style={{
              backgroundColor: "#FFFBEB", borderRadius: 12, padding: 12,
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center", marginBottom: 12,
              borderWidth: 1, borderColor: "#FCD34D", gap: 8,
            }}
          >
            <Ionicons name="warning-outline" size={18} color="#F59E0B" />
            <Text style={{ fontSize: 13, color: "#92400E", flex: 1, textAlign: isRTL ? "right" : "left" }}>
              {getLabel(
                "Autorise les notifications pour activer les rappels",
                "Allow notifications to enable reminders",
                "اسمح بالإشعارات لتفعيل التذكيرات"
              )}
            </Text>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={14} color="#F59E0B" />
          </TouchableOpacity>
        )}

        <View style={{
          backgroundColor: "#FFFFFF", borderRadius: 14,
          borderWidth: 1, borderColor: "#F3F4F6", marginBottom: 16, overflow: "hidden",
        }}>
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", padding: 16,
            borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
          }}>
            <View style={{
              width: 36, height: 36, borderRadius: 10, backgroundColor: "#6366F115",
              alignItems: "center", justifyContent: "center",
              marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
            }}>
              <Ionicons name="notifications-outline" size={18} color="#6366F1" />
            </View>
            <Text style={{ fontSize: 14, color: "#374151", flex: 1, textAlign: isRTL ? "right" : "left" }}>
              {getLabel("Activer les notifications", "Enable notifications", "تفعيل الإشعارات")}
            </Text>
            <Switch
              value={settings.enabled}
              onValueChange={() => toggleEnabled(currentLanguage)}
              trackColor={{ false: "#E5E7EB", true: "#A5B4FC" }}
              thumbColor={settings.enabled ? "#6366F1" : "#9CA3AF"}
            />
          </View>

          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", padding: 16,
            borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
            opacity: settings.enabled ? 1 : 0.4,
          }}>
            <View style={{
              width: 36, height: 36, borderRadius: 10, backgroundColor: "#10B98115",
              alignItems: "center", justifyContent: "center",
              marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
            }}>
              <Ionicons name="book-outline" size={18} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: "#374151", textAlign: isRTL ? "right" : "left" }}>
                {getLabel("Rappel d'étude quotidien", "Daily study reminder", "تذكير يومي للدراسة")}
              </Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
                {String(settings.studyReminderHour).padStart(2, "0")}:
                {String(settings.studyReminderMinute).padStart(2, "0")}
              </Text>
            </View>
            <Switch
              value={settings.studyReminderEnabled}
              onValueChange={() => {
                if (!settings.enabled) return;
                toggleStudyReminder(currentLanguage);
              }}
              trackColor={{ false: "#E5E7EB", true: "#6EE7B7" }}
              thumbColor={settings.studyReminderEnabled ? "#10B981" : "#9CA3AF"}
            />
          </View>

          {settings.enabled && settings.studyReminderEnabled && (
            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center", padding: 16,
                borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
                backgroundColor: "#F8F9FA",
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10, backgroundColor: "#EEF2FF",
                alignItems: "center", justifyContent: "center",
                marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
              }}>
                <Ionicons name="time-outline" size={18} color="#6366F1" />
              </View>
              <Text style={{ fontSize: 14, color: "#374151", flex: 1, textAlign: isRTL ? "right" : "left" }}>
                {getLabel("Heure du rappel", "Reminder time", "وقت التذكير")}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#6366F1" }}>
                {String(settings.studyReminderHour).padStart(2, "0")}:
                {String(settings.studyReminderMinute).padStart(2, "0")}
              </Text>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color="#D1D5DB" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          )}

          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", padding: 16,
            borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
            opacity: settings.enabled ? 1 : 0.4,
          }}>
            <View style={{
              width: 36, height: 36, borderRadius: 10, backgroundColor: "#FEF3C715",
              alignItems: "center", justifyContent: "center",
              marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
            }}>
              <Ionicons name="calendar-outline" size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: "#374151", textAlign: isRTL ? "right" : "left" }}>
                {getLabel("Alertes plan d'étude", "Study plan alerts", "تنبيهات خطة الدراسة")}
              </Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
                {getLabel("Rappel J-1 avant l'examen", "Reminder 1 day before exam", "تذكير قبل الامتحان بيوم")}
              </Text>
            </View>
            <Switch
              value={settings.planAlertsEnabled}
              onValueChange={() => {
                if (!settings.enabled) return;
                togglePlanAlerts(currentLanguage);
              }}
              trackColor={{ false: "#E5E7EB", true: "#FCD34D" }}
              thumbColor={settings.planAlertsEnabled ? "#F59E0B" : "#9CA3AF"}
            />
          </View>

          <TouchableOpacity
            onPress={() => sendTestNotification(currentLanguage)}
            disabled={!settings.enabled || !hasPermission}
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center", padding: 16,
              opacity: settings.enabled && hasPermission ? 1 : 0.4,
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 10, backgroundColor: "#F3F4F6",
              alignItems: "center", justifyContent: "center",
              marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
            }}>
              <Ionicons name="paper-plane-outline" size={18} color="#6B7280" />
            </View>
            <Text style={{ fontSize: 14, color: "#374151", flex: 1, textAlign: isRTL ? "right" : "left" }}>
              {getLabel("Envoyer une notification test", "Send test notification", "إرسال إشعار تجريبي")}
            </Text>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* ── Section Historiques ── */}
        <View style={{
          backgroundColor: "#FFFFFF", borderRadius: 14,
          borderWidth: 1, borderColor: "#F3F4F6", marginBottom: 16, overflow: "hidden",
        }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5, textAlign: isRTL ? "right" : "left" }}>
              {historyLabels.title}
            </Text>
          </View>
          {HISTORY_ITEMS.map(({ type, labelFr, labelEn, labelAr, icon }, index, arr) => {
            const label = getLabel(labelFr, labelEn, labelAr);
            return (
              <View
                key={type}
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center", padding: 14,
                  borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                  borderBottomColor: "#F3F4F6",
                }}
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center",
                  marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
                }}>
                  <Text style={{ fontSize: 16 }}>{icon}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: "#374151", fontWeight: "500", textAlign: isRTL ? "right" : "left" }}>
                  {label}
                </Text>
                <TouchableOpacity
                  onPress={() => confirmDeleteAll(type, label, currentLanguage, () => triggerRefresh(type))}
                  style={{
                    backgroundColor: "#FEF2F2", paddingHorizontal: 10, paddingVertical: 6,
                    borderRadius: 8, borderWidth: 1, borderColor: "#FECACA",
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#EF4444", fontWeight: "600" }}>
                    {historyLabels.clearAll}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
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

        {/* Suppression compte */}
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
                {deleteLabels.btn}
              </Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>

      {showTimePicker && (
        <DateTimePicker
          value={reminderTime}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, date) => {
            setShowTimePicker(false);
            if (date) setReminderTime(date.getHours(), date.getMinutes(), currentLanguage);
          }}
        />
      )}

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
                <Text style={{ fontSize: 28, marginRight: isRTL ? 0 : 14, marginLeft: isRTL ? 14 : 0 }}>
                  {lang.flag}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827", textAlign: isRTL ? "right" : "left" }}>
                    {lang.nativeLabel}
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
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