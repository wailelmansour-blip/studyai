// app/personal-info.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getApp } from "firebase/app";
import { useAuthStore } from "../store/authStore";
import { useLanguageStore } from "../store/languageStore";
import { useThemeStore } from "../store/themeStore";
import { Colors } from "../constants/colors";

export default function PersonalInfoScreen() {
  const { user, setFirstName: setStoreFirstName } = useAuthStore();
  const { currentLanguage } = useLanguageStore();
  const { isDark } = useThemeStore();
  const C = isDark ? Colors.dark : Colors.light;
  const isRTL = currentLanguage === "ar";
  const db = getFirestore(getApp());

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editAge, setEditAge] = useState("");

  const getLabel = (fr: string, en: string, ar: string) =>
    currentLanguage === "ar" ? ar : currentLanguage === "en" ? en : fr;

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setEditAge(age?.toString() || "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editFirstName.trim() || !editLastName.trim()) {
      Alert.alert("", getLabel("Prénom et nom requis.", "First and last name required.", "الاسم الأول واسم العائلة مطلوبان."));
      return;
    }
    const ageNum = parseInt(editAge);
    if (editAge && (isNaN(ageNum) || ageNum < 1 || ageNum > 120)) {
      Alert.alert("", getLabel("Âge invalide.", "Invalid age.", "عمر غير صالح."));
      return;
    }
    setSaving(true);
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
      setEditing(false);
      Alert.alert("✅", getLabel("Profil mis à jour !", "Profile updated!", "تم تحديث الملف الشخصي!"));
    } catch (e: any) {
      Alert.alert("", e.message || getLabel("Erreur lors de la mise à jour.", "Update failed.", "فشل التحديث."));
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { icon: "person-outline",           label: getLabel("Prénom", "First name", "الاسم الأول"),           value: firstName || "—" },
    { icon: "people-outline",           label: getLabel("Nom", "Last name", "اسم العائلة"),               value: lastName || "—" },
    { icon: "calendar-number-outline",  label: getLabel("Âge", "Age", "العمر"),                           value: age ? `${age} ${getLabel("ans", "years", "سنة")}` : "—" },
    { icon: "mail-outline",             label: "Email",                                                    value: user?.email || "—", readonly: true },
    { icon: "shield-checkmark-outline", label: getLabel("Statut", "Status", "الحالة"),                    value: getLabel("Compte vérifié ✓", "Verified account ✓", "حساب موثق ✓"), color: "#10B981" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        {/* Header */}
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", marginBottom: 24,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}
          >
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: C.text }}>
              {getLabel("Informations personnelles", "Personal Information", "المعلومات الشخصية")}
            </Text>
          </View>
          {!editing && !loading && (
            <TouchableOpacity
              onPress={handleEdit}
              style={{ backgroundColor: C.primaryLight, borderRadius: 10, padding: 8 }}
            >
              <Ionicons name="create-outline" size={20} color={C.primary} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />

        ) : editing ? (
          /* ── Mode édition ── */
          <View style={{
            backgroundColor: C.card, borderRadius: 14, padding: 16,
            borderWidth: 1, borderColor: C.border, marginBottom: 16,
          }}>
            {[
              { label: getLabel("Prénom", "First name", "الاسم الأول"),   value: editFirstName, setter: setEditFirstName, capitalize: "words" as const },
              { label: getLabel("Nom", "Last name", "اسم العائلة"),       value: editLastName,  setter: setEditLastName,  capitalize: "words" as const },
              { label: getLabel("Âge", "Age", "العمر"),                   value: editAge,       setter: setEditAge,       keyboard: "numeric" as const },
            ].map((field, index) => (
              <View key={index} style={{ marginBottom: 14 }}>
                <Text style={{
                  fontSize: 12, color: C.textTertiary,
                  marginBottom: 6, textAlign: isRTL ? "right" : "left",
                }}>
                  {field.label}
                </Text>
                <TextInput
                  value={field.value}
                  onChangeText={field.setter}
                  autoCapitalize={field.capitalize || "none"}
                  keyboardType={field.keyboard || "default"}
                  textAlign={isRTL ? "right" : "left"}
                  style={{
                    backgroundColor: C.background,
                    borderWidth: 1, borderColor: C.borderMedium,
                    borderRadius: 10, padding: 12,
                    fontSize: 15, color: C.text,
                  }}
                />
              </View>
            ))}

            {/* Email readonly */}
            <Text style={{
              fontSize: 12, color: C.textTertiary,
              marginBottom: 6, textAlign: isRTL ? "right" : "left",
            }}>
              Email — <Text style={{ color: C.borderMedium }}>
                {getLabel("Non modifiable", "Read only", "غير قابل للتعديل")}
              </Text>
            </Text>
            <View style={{
              backgroundColor: isDark ? "#0F172A" : "#F3F4F6",
              borderRadius: 10, padding: 12, marginBottom: 20,
            }}>
              <Text style={{ fontSize: 15, color: C.textTertiary }}>{user?.email}</Text>
            </View>

            {/* Boutons Annuler / Enregistrer */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setEditing(false)}
                style={{
                  flex: 1, borderRadius: 10, padding: 12,
                  alignItems: "center",
                  backgroundColor: isDark ? "#1E293B" : "#F3F4F6",
                  borderWidth: 1, borderColor: C.borderMedium,
                }}
              >
                <Text style={{ fontWeight: "600", color: C.text }}>
                  {getLabel("Annuler", "Cancel", "إلغاء")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{
                  flex: 1, borderRadius: 10, padding: 12, alignItems: "center",
                  backgroundColor: saving ? (isDark ? "#3730A3" : "#A5B4FC") : C.primary,
                }}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={{ fontWeight: "600", color: "#FFF" }}>
                      {getLabel("Enregistrer", "Save", "حفظ")}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          </View>

        ) : (
          /* ── Mode lecture ── */
          <View style={{
            backgroundColor: C.card, borderRadius: 14,
            borderWidth: 1, borderColor: C.border,
            marginBottom: 16, overflow: "hidden",
          }}>
            {fields.map((field, index) => (
              <View
                key={index}
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center", padding: 16,
                  borderBottomWidth: index < fields.length - 1 ? 1 : 0,
                  borderBottomColor: C.border,
                }}
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: field.color
                    ? (isDark ? "#022C22" : "#10B98115")
                    : C.primaryLight,
                  alignItems: "center", justifyContent: "center",
                  marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
                }}>
                  <Ionicons
                    name={field.icon as any}
                    size={18}
                    color={field.color || C.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 12, color: C.textTertiary,
                    marginBottom: 2, textAlign: isRTL ? "right" : "left",
                  }}>
                    {field.label}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: field.color || C.text,
                    fontWeight: "500", textAlign: isRTL ? "right" : "left",
                  }}>
                    {field.value}
                  </Text>
                </View>
                {field.readonly && (
                  <View style={{
                    backgroundColor: isDark ? "#1E293B" : "#F3F4F6",
                    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
                  }}>
                    <Text style={{ fontSize: 11, color: C.textTertiary }}>
                      {getLabel("Non modifiable", "Read only", "غير قابل للتعديل")}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Modifier mot de passe */}
        <TouchableOpacity
          onPress={() => router.push("/changePassword" as any)}
          style={{
            backgroundColor: C.card, borderRadius: 14, padding: 16,
            flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center",
            borderWidth: 1, borderColor: C.border,
          }}
        >
          <View style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: C.primaryLight,
            alignItems: "center", justifyContent: "center",
            marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
          }}>
            <Ionicons name="lock-closed-outline" size={18} color={C.primary} />
          </View>
          <Text style={{
            flex: 1, fontSize: 14, color: C.text,
            fontWeight: "500", textAlign: isRTL ? "right" : "left",
          }}>
            {getLabel("Modifier le mot de passe", "Change password", "تغيير كلمة المرور")}
          </Text>
          <Ionicons
            name={isRTL ? "chevron-back" : "chevron-forward"}
            size={16} color={C.borderMedium}
          />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}