import React, { useState } from "react";
import { View, TextInput, Text, TouchableOpacity, TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  isPassword = false,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-slate-400 text-sm font-medium mb-2 ml-1">
          {label}
        </Text>
      )}
      <View
        className={`flex-row items-center bg-slate-800 rounded-2xl px-4 py-4 border ${
          isFocused ? "border-indigo-500" : error ? "border-red-500" : "border-slate-700"
        }`}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={isFocused ? "#6366f1" : "#64748b"}
            style={{ marginRight: 12 }}
          />
        )}
        <TextInput
          className="flex-1 text-white text-base"
          placeholderTextColor="#475569"
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#475569"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text className="text-red-400 text-xs mt-1 ml-1">{error}</Text>
      )}
    </View>
  );
};
