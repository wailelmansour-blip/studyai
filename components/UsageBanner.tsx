// components/UsageBanner.tsx
import React, { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUsageStore } from "../store/usageStore";
import { LIMITS } from "../types/usage";
import { useLanguageStore } from "../store/languageStore";
import { router } from "expo-router";
import { trackConversion } from "../services/analytics";

interface Props { isRTL?: boolean; }

export const UsageBanner: React.FC<Props> = ({ isRTL = false }) => {
  const { usage } = useUsageStore();
  const { currentLanguage } = useLanguageStore();

  // ── calcul AVANT le return null ──
  const isDone = usage
    ? Math.max(0, LIMITS[usage.plan] - usage.count) === 0
    : false;

  // ── useEffect AVANT le return null ──
  useEffect(() => {
    if (isDone) trackConversion("limit_reached").catch(() => {});
  }, [isDone]);

  if (!usage) return null;

  const limit = LIMITS[usage.plan];
  const remaining = Math.max(0, limit - usage.count);
  const percent = Math.min(100, (usage.count / limit) * 100);
  const isPremium = usage.plan === "premium";
  const isAlmostDone = remaining <= 1 && !isPremium;
  // isDone déjà calculé ci-dessus — pas de doublon

  const getLabel = () => {
    if (currentLanguage === "ar")
      return isDone ? "تم الوصول إلى الحد اليومي" : `${remaining} طلب متبقي من ${limit}`;
    if (currentLanguage === "en")
      return isDone ? "Daily limit reached" : `${remaining} of ${limit} requests left`;
    return isDone ? "Limite atteinte" : `${remaining} / ${limit} requêtes restantes`;
  };

  const getUpgradeLabel = () =>
    currentLanguage === "ar" ? "ترقية ✨"
    : currentLanguage === "en" ? "Upgrade ✨"
    : "Premium ✨";

  const config = isDone
    ? { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", bar: "#EF4444", icon: "warning" as any }
    : isAlmostDone
    ? { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", bar: "#F59E0B", icon: "warning-outline" as any }
    : isPremium
    ? { bg: "#F0FDF4", border: "#BBF7D0", text: "#065F46", bar: "#10B981", icon: "star" as any }
    : { bg: "#EEF2FF", border: "#C7D2FE", text: "#3730A3", bar: "#6366F1", icon: "flash" as any };

  return (
    <View style={{
      backgroundColor: config.bg,
      borderRadius: 14, padding: 12, marginBottom: 16,
      borderWidth: 1, borderColor: config.border,
    }}>
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center", justifyContent: "space-between",
        marginBottom: 8,
      }}>
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", gap: 6, flex: 1,
        }}>
          <View style={{
            width: 24, height: 24, borderRadius: 8,
            backgroundColor: config.bar + "20",
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name={config.icon} size={13} color={config.bar} />
          </View>
          <Text style={{ fontSize: 13, fontWeight: "600", color: config.text, flex: 1 }}>
            {getLabel()}
          </Text>
          {isPremium && (
            <View style={{
              backgroundColor: "#10B981", borderRadius: 6,
              paddingHorizontal: 8, paddingVertical: 2,
            }}>
              <Text style={{ fontSize: 10, color: "#fff", fontWeight: "800", letterSpacing: 0.5 }}>
                PREMIUM
              </Text>
            </View>
          )}
        </View>

        {!isPremium && isAlmostDone && (
          <TouchableOpacity
            onPress={() => {
              trackConversion("upgrade_view").catch(() => {});
              router.push("/profile");
            }}
            style={{
              backgroundColor: "#6366F1", borderRadius: 8,
              paddingHorizontal: 10, paddingVertical: 4,
              marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0,
            }}
          >
            <Text style={{ fontSize: 11, color: "#fff", fontWeight: "700" }}>
              {getUpgradeLabel()}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Barre de progression */}
      <View style={{
        height: 5, backgroundColor: config.bar + "20",
        borderRadius: 3, overflow: "hidden",
      }}>
        <View style={{
          height: 5, width: `${percent}%`,
          backgroundColor: config.bar, borderRadius: 3,
        }} />
      </View>
    </View>
  );
};