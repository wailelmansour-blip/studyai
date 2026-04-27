// store/notificationStore.ts
import { create } from "zustand";
import {
  NotificationSettings,
  DEFAULT_SETTINGS,
  loadNotificationSettings,
  saveNotificationSettings,
  scheduleStudyReminder,
  cancelStudyReminder,
  requestNotificationPermission,
} from "../services/notifications";

interface NotificationState {
  settings: NotificationSettings;
  hasPermission: boolean;
  isLoading: boolean;
  loadSettings: (language: string) => Promise<void>;
  updateSettings: (
    partial: Partial<NotificationSettings>,
    language: string
  ) => Promise<void>;
  toggleEnabled: (language: string) => Promise<void>;
  toggleStudyReminder: (language: string) => Promise<void>;
  togglePlanAlerts: (language: string) => Promise<void>;
  setReminderTime: (hour: number, minute: number, language: string) => Promise<void>;
  checkPermission: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  hasPermission: false,
  isLoading: false,

  loadSettings: async (language: string) => {
    set({ isLoading: true });
    try {
      const settings = await loadNotificationSettings();
      const { status } = await import("expo-notifications").then((m) =>
        m.getPermissionsAsync()
      );
      set({ settings, hasPermission: status === "granted" });
      // Replanifier au chargement pour s'assurer que tout est actif
      if (settings.enabled && settings.studyReminderEnabled) {
        await scheduleStudyReminder(settings, language);
      }
    } catch (e) {
      console.log("loadSettings error:", e);
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (partial, language) => {
    const current = get().settings;
    const updated = { ...current, ...partial };
    set({ settings: updated });
    await saveNotificationSettings(updated);
    await scheduleStudyReminder(updated, language);
  },

  toggleEnabled: async (language) => {
    const current = get().settings;
    const updated = { ...current, enabled: !current.enabled };
    set({ settings: updated });
    await saveNotificationSettings(updated);
    if (updated.enabled) {
      await scheduleStudyReminder(updated, language);
    } else {
      await cancelStudyReminder();
    }
  },

  toggleStudyReminder: async (language) => {
    const current = get().settings;
    const updated = {
      ...current,
      studyReminderEnabled: !current.studyReminderEnabled,
    };
    set({ settings: updated });
    await saveNotificationSettings(updated);
    await scheduleStudyReminder(updated, language);
  },

  togglePlanAlerts: async (language) => {
    const current = get().settings;
    const updated = { ...current, planAlertsEnabled: !current.planAlertsEnabled };
    set({ settings: updated });
    await saveNotificationSettings(updated);
  },

  setReminderTime: async (hour, minute, language) => {
    const current = get().settings;
    const updated = {
      ...current,
      studyReminderHour: hour,
      studyReminderMinute: minute,
    };
    set({ settings: updated });
    await saveNotificationSettings(updated);
    await scheduleStudyReminder(updated, language);
  },

  checkPermission: async () => {
    const granted = await requestNotificationPermission();
    set({ hasPermission: granted });
  },
}));