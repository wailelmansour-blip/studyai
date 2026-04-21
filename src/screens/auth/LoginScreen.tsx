import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "../../components";
import { useAuthStore } from "../../store";
import { AuthStackParamList } from "../../utils/types";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Login">;
};

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { login, isLoading } = useAuthStore();

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email.includes("@")) newErrors.email = "Enter a valid email";
    if (password.length < 6) newErrors.password = "Minimum 6 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    await login(email, password);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-10 pb-6">
            {/* Logo */}
            <View className="items-center mb-12">
              <View className="w-20 h-20 bg-indigo-500 rounded-3xl items-center justify-center mb-4 shadow-lg shadow-indigo-500/40">
                <Ionicons name="sparkles" size={36} color="white" />
              </View>
              <Text className="text-white text-3xl font-bold">StudyAI</Text>
              <Text className="text-slate-400 text-sm mt-1">
                Learn smarter, not harder
              </Text>
            </View>

            {/* Form */}
            <View className="mb-6">
              <Text className="text-white text-2xl font-bold mb-1">
                Welcome back 👋
              </Text>
              <Text className="text-slate-400 text-sm mb-8">
                Sign in to continue your learning journey
              </Text>

              <Input
                label="Email"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail-outline"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
              />

              <Input
                label="Password"
                placeholder="••••••••"
                leftIcon="lock-closed-outline"
                isPassword
                value={password}
                onChangeText={setPassword}
                error={errors.password}
              />

              <TouchableOpacity className="self-end mb-6">
                <Text className="text-indigo-400 text-sm font-medium">
                  Forgot password?
                </Text>
              </TouchableOpacity>

              <Button
                title="Sign In"
                onPress={handleLogin}
                isLoading={isLoading}
              />
            </View>

            {/* Divider */}
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-px bg-slate-700" />
              <Text className="text-slate-500 mx-4 text-sm">or continue with</Text>
              <View className="flex-1 h-px bg-slate-700" />
            </View>

            {/* Social */}
            <View className="flex-row gap-4 mb-8">
              {(["logo-google", "logo-apple"] as const).map((icon) => (
                <TouchableOpacity
                  key={icon}
                  className="flex-1 flex-row items-center justify-center bg-slate-800 border border-slate-700 rounded-2xl py-4"
                >
                  <Ionicons name={icon} size={22} color="#94a3b8" />
                </TouchableOpacity>
              ))}
            </View>

            {/* Footer */}
            <View className="flex-row justify-center mt-auto">
              <Text className="text-slate-400 text-sm">
                Don't have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                <Text className="text-indigo-400 text-sm font-semibold">
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
