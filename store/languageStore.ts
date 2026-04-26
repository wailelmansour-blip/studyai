// store/languageStore.ts
import { create } from "zustand";
import i18n from "../i18n";
import { I18nManager, Alert } from "react-native";

export type Language = "fr" | "en" | "ar";

export interface LanguageOption {
  code: Language;
  label: string;
  nativeLabel: string;
  flag: string;
  isRTL: boolean;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "fr", label: "Français", nativeLabel: "Français", flag: "🇫🇷", isRTL: false },
  { code: "en", label: "English",  nativeLabel: "English",  flag: "🇬🇧", isRTL: false },
  { code: "ar", label: "Arabe",    nativeLabel: "العربية",  flag: "🇸🇦", isRTL: true  },
];

interface LanguageState {
  currentLanguage: Language;
  isRTL: boolean;
  setLanguage: (lang: Language) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  currentLanguage: "fr",
  isRTL: false,

  setLanguage: async (lang: Language) => {
    const option = LANGUAGES.find((l) => l.code === lang);
    if (!option) return;

    // Changer la langue i18n immédiatement
    await i18n.changeLanguage(lang);
    set({ currentLanguage: lang, isRTL: option.isRTL });

    // RTL nécessite un redémarrage de l'app
    if (I18nManager.isRTL !== option.isRTL) {
      I18nManager.allowRTL(option.isRTL);
      I18nManager.forceRTL(option.isRTL);
      Alert.alert(
        option.isRTL ? "إعادة التشغيل مطلوبة" : "Restart Required",
        option.isRTL
          ? "يرجى إعادة تشغيل التطبيق لتفعيل اتجاه النص العربي."
          : "Please restart the app to apply the RTL layout for Arabic.",
        [{ text: "OK" }]
      );
    }
  },
}));