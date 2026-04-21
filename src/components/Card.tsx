import React from "react";
import { View, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: "default" | "elevated";
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  className,
  ...props
}) => {
  const styles = {
    default: "bg-slate-800 rounded-3xl p-5 border border-slate-700/50",
    elevated: "bg-slate-800 rounded-3xl p-5 shadow-lg shadow-black/40",
  };

  return (
    <View className={`${styles[variant]} ${className ?? ""}`} {...props}>
      {children}
    </View>
  );
};
