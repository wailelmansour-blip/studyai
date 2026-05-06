// hooks/useAIRequest.ts
import { Alert } from "react-native";
import { useUsageStore } from "../store/usageStore";
import { LIMITS, FILE_LIMITS } from "../types/usage";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../store/languageStore";

export const useAIRequest = () => {
  const { usage, consumeRequest, consumeFileRequest, isLoading } = useUsageStore();
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

  const getFileLimitMessage = () => {
    if (currentLanguage === "ar")
      return `لقد استخدمت حصتك اليومية من الملفات.\n\nالخطة المجانية: ${FILE_LIMITS.free} ملف/يوم\nالخطة المدفوعة: ${FILE_LIMITS.premium} ملف/يوم\n\nقم بالترقية للحصول على المزيد.`;
    if (currentLanguage === "en")
      return `You've used your daily file uploads.\n\nFree plan: ${FILE_LIMITS.free} file/day\nPremium plan: ${FILE_LIMITS.premium} files/day\n\nUpgrade for more.`;
    return `Vous avez utilisé votre quota de fichiers du jour.\n\nPlan gratuit : ${FILE_LIMITS.free} fichier/jour\nPlan premium : ${FILE_LIMITS.premium} fichiers/jour\n\nPassez au premium pour plus.`;
  };

  const getTitle = () => {
    if (currentLanguage === "ar") return "تم الوصول إلى الحد اليومي";
    if (currentLanguage === "en") return "Daily limit reached";
    return "Limite journalière atteinte";
  };

  const getFileTitle = () => {
    if (currentLanguage === "ar") return "تم الوصول إلى حد الملفات اليومي";
    if (currentLanguage === "en") return "Daily file limit reached";
    return "Limite de fichiers atteinte";
  };

  const checkAndConsume = async (): Promise<boolean> => {
    const allowed = await consumeRequest();
    if (!allowed) {
      Alert.alert(getTitle(), getLimitMessage());
      return false;
    }
    return true;
  };

  const checkAndConsumeFile = async (): Promise<boolean> => {
    const allowed = await consumeFileRequest();
    if (!allowed) {
      Alert.alert(getFileTitle(), getFileLimitMessage());
      return false;
    }
    return true;
  };

  return {
    usage,
    isLoading,
    getRemainingText,
    checkAndConsume,
    checkAndConsumeFile,
  };
};