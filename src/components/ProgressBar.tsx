import React from "react";
import { View, Text } from "react-native";

interface ProgressBarProps {
  progress: number; // 0–100
  color?: string;
  showLabel?: boolean;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = "#6366f1",
  showLabel = false,
  height = 6,
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <View>
      <View
        className="w-full bg-slate-700 rounded-full overflow-hidden"
        style={{ height }}
      >
        <View
          className="rounded-full"
          style={{
            width: `${clamped}%`,
            height,
            backgroundColor: color,
          }}
        />
      </View>
      {showLabel && (
        <Text className="text-slate-400 text-xs mt-1 text-right">
          {clamped}%
        </Text>
      )}
    </View>
  );
};
