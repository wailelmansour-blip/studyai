import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  TouchableOpacityProps,
} from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "ghost";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = "primary",
  isLoading = false,
  icon,
  style,
  ...props
}) => {
  const base =
    "flex-row items-center justify-center rounded-2xl py-4 px-6 min-w-[120px]";

  const variants = {
    primary: "bg-indigo-500 active:bg-indigo-600",
    secondary: "bg-slate-700 active:bg-slate-600",
    ghost: "border border-slate-600 active:bg-slate-800",
  };

  const textVariants = {
    primary: "text-white font-semibold text-base",
    secondary: "text-slate-100 font-semibold text-base",
    ghost: "text-slate-300 font-semibold text-base",
  };

  return (
    <TouchableOpacity
      className={`${base} ${variants[variant]} ${isLoading ? "opacity-70" : ""}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={textVariants[variant]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
