// services/notifications.ts
// Phase 16 — Notifications : rappels d'étude + alertes plan
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const NOTIF_SETTINGS_KEY = "studyai_notif_settings";

export interface NotificationSettings {
  enabled: boolean;
  studyReminderEnabled: boolean;
  studyReminderHour: number;   // 0-23
  studyReminderMinute: number; // 0-59
  planAlertsEnabled: boolean;
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  studyReminderEnabled: true,
  studyReminderHour: 20,    // 20h00 par défaut
  studyReminderMinute: 0,
  planAlertsEnabled: true,
};

// ── Configuration du comportement des notifications ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Demander la permission ──
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("studyai", {
      name: "StudyAI",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
};

// ── Charger les paramètres ──
export const loadNotificationSettings =
  async (): Promise<NotificationSettings> => {
    try {
      const raw = await AsyncStorage.getItem(NOTIF_SETTINGS_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_SETTINGS;
  };

// ── Sauvegarder les paramètres ──
export const saveNotificationSettings = async (
  settings: NotificationSettings
): Promise<void> => {
  await AsyncStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(settings));
};

// ── Planifier le rappel d'étude quotidien ──
export const scheduleStudyReminder = async (
  settings: NotificationSettings,
  language: string
): Promise<void> => {
  // Annuler l'ancien rappel d'abord
  await cancelStudyReminder();

  if (!settings.enabled || !settings.studyReminderEnabled) return;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const title =
    language === "ar" ? "📚 وقت الدراسة!"
    : language === "en" ? "📚 Study Time!"
    : "📚 Heure d'étudier !";

  const body =
    language === "ar" ? "لا تنسَ مراجعة دروسك اليوم 💪"
    : language === "en" ? "Don't forget to review your lessons today 💪"
    : "N'oublie pas de réviser tes cours aujourd'hui 💪";

  await Notifications.scheduleNotificationAsync({
    identifier: "study_reminder",
    content: { title, body, sound: "default" },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: settings.studyReminderHour,
      minute: settings.studyReminderMinute,
    },
  });
};

// ── Annuler le rappel d'étude ──
export const cancelStudyReminder = async (): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync("study_reminder")
    .catch(() => {});
};

// ── Planifier une alerte plan (J-1 avant l'examen) ──
export const schedulePlanAlert = async (
  examDate: string,
  subjects: string[],
  language: string
): Promise<void> => {
  const settings = await loadNotificationSettings();
  if (!settings.enabled || !settings.planAlertsEnabled) return;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const exam = new Date(examDate);
  const alertDate = new Date(exam);
  alertDate.setDate(alertDate.getDate() - 1); // J-1
  alertDate.setHours(9, 0, 0, 0); // 9h00

  // Ne pas planifier si la date est déjà passée
  if (alertDate <= new Date()) return;

  const subjectList = subjects.slice(0, 3).join(", ");

  const title =
    language === "ar" ? "⚠️ الامتحان غداً!"
    : language === "en" ? "⚠️ Exam Tomorrow!"
    : "⚠️ Examen demain !";

  const body =
    language === "ar"
      ? `راجع مواد الامتحان: ${subjectList}`
      : language === "en"
      ? `Review your exam subjects: ${subjectList}`
      : `Révise tes matières d'examen : ${subjectList}`;

  // Identifiant unique par date d'examen
  const identifier = `plan_alert_${exam.toISOString().split("T")[0]}`;

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, sound: "default" },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: alertDate,
    },
  });
};

// ── Annuler toutes les alertes plan ──
export const cancelAllPlanAlerts = async (): Promise<void> => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const planAlerts = scheduled.filter((n) =>
    n.identifier.startsWith("plan_alert_")
  );
  await Promise.all(
    planAlerts.map((n) =>
      Notifications.cancelScheduledNotificationAsync(n.identifier)
    )
  );
};

// ── Envoyer une notification immédiate (test) ──
export const sendTestNotification = async (language: string): Promise<void> => {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: language === "ar" ? "✅ الإشعارات تعمل!"
        : language === "en" ? "✅ Notifications work!"
        : "✅ Les notifications fonctionnent !",
      body: language === "ar" ? "StudyAI سيذكّرك بالدراسة كل يوم"
        : language === "en" ? "StudyAI will remind you to study every day"
        : "StudyAI te rappellera d'étudier chaque jour",
      sound: "default",
    },
    trigger: null, // immédiat
  });
};