// hooks/useAIRequest.ts
import { Alert } from "react-native";
import { useUsageStore } from "../store/usageStore";
import { LIMITS } from "../types/usage";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../store/languageStore";

/**
 * Hook à utiliser dans TOUS les écrans IA (summary, quiz, explain, solve, flashcards, chat, plan).
 * Avant chaque appel IA, appeler `checkAndConsume()`.
 * Si retourne false → affiche l'alerte et NE PAS appeler la Cloud Function.
 */
export const useAIRequest = () => {
  const { usage, consumeRequest, isLoading } = useUsageStore();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();

  const getRemainingText = () => {
    if (!usage) return "";
    const limit = LIMITS[usage.plan];
    const remaining = Math.max(0, limit - usage.count);
    if (currentLanguage === "ar") return `${remaining} طلب متبقي اليوم`;
    if (currentLanguage === "en") return `${remaining} request${remaining !== 1 ? "s" : ""} left today`;
    return `${remaining} requête${remaining !== 1 ? "s" : ""} restante${remaining !== 1 ? "s" : ""} aujourd'hui`;
  };

  const getLimitMessage = () => {
    const plan = usage?.plan || "free";
    const limit = LIMITS[plan];
    if (currentLanguage === "ar")
      return `لقد استنفدت ${limit} طلبات اليوم.\n\nالخطة المجانية: ${LIMITS.free} طلبات/يوم\nالخطة المدفوعة: ${LIMITS.premium} طلبات/يوم\n\nقم بالترقية للحصول على المزيد.`;
    if (currentLanguage === "en")
      return `You've used your ${limit} daily requests.\n\nFree plan: ${LIMITS.free}/day\nPremium plan: ${LIMITS.premium}/day\n\nUpgrade for more requests.`;
    return `Vous avez utilisé vos ${limit} requêtes du jour.\n\nPlan gratuit : ${LIMITS.free}/jour\nPlan premium : ${LIMITS.premium}/jour\n\nPassez au premium pour plus de requêtes.`;
  };

  const getTitle = () => {
    if (currentLanguage === "ar") return "تم الوصول إلى الحد اليومي";
    if (currentLanguage === "en") return "Daily limit reached";
    return "Limite journalière atteinte";
  };

  /**
   * Vérifie et consomme une requête.
   * @returns true si l'appel IA peut continuer, false si bloqué.
   */
  const checkAndConsume = async (): Promise<boolean> => {
    const allowed = await consumeRequest();
    if (!allowed) {
      Alert.alert(getTitle(), getLimitMessage());
      return false;
    }
    return true;
  };

  return {
    usage,
    isLoading,
    getRemainingText,
    checkAndConsume,
  };
};
