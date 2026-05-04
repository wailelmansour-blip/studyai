// store/languageStore.ts
import { create } from "zustand";
import i18n from "../i18n";

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

export const useLanguageStore = create<LanguageState>((set) => ({
  currentLanguage: "fr",
  isRTL: false,

  setLanguage: async (lang: Language) => {
    const option = LANGUAGES.find((l) => l.code === lang);
    if (!option) return;
    await i18n.changeLanguage(lang);
    set({ currentLanguage: lang, isRTL: option.isRTL });
    // I18nManager supprimé — RTL géré manuellement dans les composants
  },
}));