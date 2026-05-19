// app/notification-settings.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Switch, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLanguageStore } from "../store/languageStore";
import { useNotificationStore } from "../store/notificationStore";
import { useThemeStore } from "../store/themeStore";
import { Colors } from "../constants/colors";
import { sendTestNotification } from "../services/notifications";

export default function NotificationSettingsScreen() {
  const { currentLanguage } = useLanguageStore();
  const { isDark } = useThemeStore();
  const C = isDark ? Colors.dark : Colors.light;
  const isRTL = currentLanguage === "ar";
  const {
    settings, hasPermission, loadSettings,
    toggleEnabled, toggleStudyReminder, togglePlanAlerts,
    setReminderTime, checkPermission,
  } = useNotificationStore();
  const [showTimePicker, setShowTimePicker] = useState(false);

  const getLabel = (fr: string, en: string, ar: string) =>
    currentLanguage === "ar" ? ar : currentLanguage === "en" ? en : fr;

  useEffect(() => {
    loadSettings(currentLanguage);
    checkPermission();
  }, []);

  const reminderTime = new Date();
  reminderTime.setHours(settings.studyReminderHour, settings.studyReminderMinute, 0, 0);

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
          <Text style={{ fontSize: 22, fontWeight: "700", color: C.text }}>
            🔔 {getLabel("Notifications", "Notifications", "الإشعارات")}
          </Text>
        </View>

        {/* Alerte permission */}
        {!hasPermission && (
          <TouchableOpacity
            onPress={checkPermission}
            style={{
              backgroundColor: isDark ? "#2D1B00" : "#FFFBEB",
              borderRadius: 12, padding: 12,
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center", marginBottom: 16,
              borderWidth: 1, borderColor: isDark ? "#92400E" : "#FCD34D",
              gap: 8,
            }}
          >
            <Ionicons name="warning-outline" size={18} color="#F59E0B" />
            <Text style={{
              fontSize: 13,
              color: isDark ? "#FCD34D" : "#92400E",
              flex: 1, textAlign: isRTL ? "right" : "left",
            }}>
              {getLabel(
                "Autorise les notifications pour activer les rappels",
                "Allow notifications to enable reminders",
                "اسمح بالإشعارات لتفعيل التذكيرات"
              )}
            </Text>
            <Ionicons
              name={isRTL ? "chevron-back" : "chevron-forward"}
              size={14} color="#F59E0B"
            />
          </TouchableOpacity>
        )}

        {/* Paramètres */}
        <View style={{
          backgroundColor: C.card, borderRadius: 14,
          borderWidth: 1, borderColor: C.border, overflow: "hidden",
        }}>

          {/* Activer notifications */}
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", padding: 16,
            borderBottomWidth: 1, borderBottomColor: C.border,
          }}>
            <View style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: C.primaryLight,
              alignItems: "center", justifyContent: "center",
              marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
            }}>
              <Ionicons name="notifications-outline" size={18} color={C.primary} />
            </View>
            <Text style={{
              fontSize: 14, color: C.text, flex: 1,
              textAlign: isRTL ? "right" : "left",
            }}>
              {getLabel("Activer les notifications", "Enable notifications", "تفعيل الإشعارات")}
            </Text>
            <Switch
              value={settings.enabled}
              onValueChange={() => toggleEnabled(currentLanguage)}
              trackColor={{ false: C.borderMedium, true: isDark ? "#4338CA" : "#A5B4FC" }}
              thumbColor={settings.enabled ? C.primary : C.textTertiary}
            />
          </View>

          {/* Rappel quotidien */}
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", padding: 16,
            borderBottomWidth: 1, borderBottomColor: C.border,
            opacity: settings.enabled ? 1 : 0.4,
          }}>
            <View style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: isDark ? "#022C22" : "#10B98115",
              alignItems: "center", justifyContent: "center",
              marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
            }}>
              <Ionicons name="book-outline" size={18} color={C.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 14, color: C.text,
                textAlign: isRTL ? "right" : "left",
              }}>
                {getLabel("Rappel d'étude quotidien", "Daily study reminder", "تذكير يومي للدراسة")}
              </Text>
              <Text style={{
                fontSize: 12, color: C.textTertiary,
                marginTop: 2, textAlign: isRTL ? "right" : "left",
              }}>
                {String(settings.studyReminderHour).padStart(2, "0")}:{String(settings.studyReminderMinute).padStart(2, "0")}
              </Text>
            </View>
            <Switch
              value={settings.studyReminderEnabled}
              onValueChange={() => { if (!settings.enabled) return; toggleStudyReminder(currentLanguage); }}
              trackColor={{ false: C.borderMedium, true: isDark ? "#065F46" : "#6EE7B7" }}
              thumbColor={settings.studyReminderEnabled ? C.success : C.textTertiary}
            />
          </View>

          {/* Heure rappel */}
          {settings.enabled && settings.studyReminderEnabled && (
            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center", padding: 16,
                borderBottomWidth: 1, borderBottomColor: C.border,
                backgroundColor: isDark ? "#0F172A" : "#F8F9FA",
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: C.primaryLight,
                alignItems: "center", justifyContent: "center",
                marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
              }}>
                <Ionicons name="time-outline" size={18} color={C.primary} />
              </View>
              <Text style={{
                fontSize: 14, color: C.text, flex: 1,
                textAlign: isRTL ? "right" : "left",
              }}>
                {getLabel("Heure du rappel", "Reminder time", "وقت التذكير")}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: C.primary }}>
                {String(settings.studyReminderHour).padStart(2, "0")}:{String(settings.studyReminderMinute).padStart(2, "0")}
              </Text>
              <Ionicons
                name={isRTL ? "chevron-back" : "chevron-forward"}
                size={16} color={C.borderMedium} style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
          )}

          {/* Alertes plan */}
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", padding: 16,
            borderBottomWidth: 1, borderBottomColor: C.border,
            opacity: settings.enabled ? 1 : 0.4,
          }}>
            <View style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: isDark ? "#2D1B00" : "#FEF3C715",
              alignItems: "center", justifyContent: "center",
              marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
            }}>
              <Ionicons name="calendar-outline" size={18} color={C.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 14, color: C.text,
                textAlign: isRTL ? "right" : "left",
              }}>
                {getLabel("Alertes plan d'étude", "Study plan alerts", "تنبيهات خطة الدراسة")}
              </Text>
              <Text style={{
                fontSize: 12, color: C.textTertiary,
                marginTop: 2, textAlign: isRTL ? "right" : "left",
              }}>
                {getLabel("Rappel J-1 avant l'examen", "Reminder 1 day before exam", "تذكير قبل الامتحان بيوم")}
              </Text>
            </View>
            <Switch
              value={settings.planAlertsEnabled}
              onValueChange={() => { if (!settings.enabled) return; togglePlanAlerts(currentLanguage); }}
              trackColor={{ false: C.borderMedium, true: isDark ? "#92400E" : "#FCD34D" }}
              thumbColor={settings.planAlertsEnabled ? C.warning : C.textTertiary}
            />
          </View>

          {/* Test notification */}
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
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: isDark ? "#1E293B" : "#F3F4F6",
              alignItems: "center", justifyContent: "center",
              marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
            }}>
              <Ionicons name="paper-plane-outline" size={18} color={C.textSecondary} />
            </View>
            <Text style={{
              fontSize: 14, color: C.text, flex: 1,
              textAlign: isRTL ? "right" : "left",
            }}>
              {getLabel("Envoyer une notification test", "Send test notification", "إرسال إشعار تجريبي")}
            </Text>
            <Ionicons
              name={isRTL ? "chevron-back" : "chevron-forward"}
              size={16} color={C.borderMedium}
            />
          </TouchableOpacity>
        </View>

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
    </SafeAreaView>
  );
}