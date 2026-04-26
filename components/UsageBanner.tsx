// components/UsageBanner.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUsageStore } from "../store/usageStore";
import { LIMITS } from "../types/usage";
import { useLanguageStore } from "../store/languageStore";
import { router } from "expo-router";

interface Props {
  isRTL?: boolean;
}

export const UsageBanner: React.FC<Props> = ({ isRTL = false }) => {
  const { usage } = useUsageStore();
  const { currentLanguage } = useLanguageStore();

  if (!usage) return null;

  const limit = LIMITS[usage.plan];
  const remaining = Math.max(0, limit - usage.count);
  const percent = Math.min(100, (usage.count / limit) * 100);
  const isPremium = usage.plan === "premium";
  const isAlmostDone = remaining <= 1 && !isPremium;
  const isDone = remaining === 0;

  const getLabel = () => {
    if (currentLanguage === "ar") {
      return isDone
        ? "تم الوصول إلى الحد اليومي"
        : `${remaining} طلب متبقي من ${limit}`;
    }
    if (currentLanguage === "en") {
      return isDone
        ? "Daily limit reached"
        : `${remaining} of ${limit} requests left`;
    }
    return isDone
      ? "Limite journalière atteinte"
      : `${remaining} / ${limit} requêtes restantes`;
  };

  const getUpgradeLabel = () => {
    if (currentLanguage === "ar") return "ترقية";
    if (currentLanguage === "en") return "Upgrade";
    return "Passer au premium";
  };

  const getBgColor = () => {
    if (isDone) return "#FEF2F2";
    if (isAlmostDone) return "#FFFBEB";
    if (isPremium) return "#F0FDF4";
    return "#EEF2FF";
  };

  const getTextColor = () => {
    if (isDone) return "#991B1B";
    if (isAlmostDone) return "#92400E";
    if (isPremium) return "#065F46";
    return "#3730A3";
  };

  const getBarColor = () => {
    if (isDone) return "#EF4444";
    if (isAlmostDone) return "#F59E0B";
    if (isPremium) return "#10B981";
    return "#6366F1";
  };

  const getIcon = (): any => {
    if (isDone) return "warning";
    if (isPremium) return "star";
    return "flash";
  };

  return (
    <View style={{
      backgroundColor: getBgColor(),
      borderRadius: 10, padding: 10, marginBottom: 14,
    }}>
      {/* Ligne principale */}
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center", justifyContent: "space-between",
      }}>
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", gap: 6, flex: 1,
        }}>
          <Ionicons name={getIcon()} size={14} color={getTextColor()} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: getTextColor() }}>
            {getLabel()}
          </Text>
          {isPremium && (
            <View style={{
              backgroundColor: "#10B981", borderRadius: 4,
              paddingHorizontal: 6, paddingVertical: 1,
            }}>
              <Text style={{ fontSize: 10, color: "#fff", fontWeight: "700" }}>
                PREMIUM
              </Text>
            </View>
          )}
        </View>

        {/* Bouton upgrade si free et presque à la limite */}
        {!isPremium && isAlmostDone && (
          <TouchableOpacity
            onPress={() => router.push("/profile")}
            style={{
              backgroundColor: "#6366F1", borderRadius: 6,
              paddingHorizontal: 8, paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 11, color: "#fff", fontWeight: "700" }}>
              {getUpgradeLabel()} ✨
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Barre de progression */}
      <View style={{
        marginTop: 6, height: 4, backgroundColor: "#E5E7EB",
        borderRadius: 2, overflow: "hidden",
      }}>
        <View style={{
          height: 4, width: `${percent}%`,
          backgroundColor: getBarColor(), borderRadius: 2,
        }} />
      </View>
    </View>
  );
};
