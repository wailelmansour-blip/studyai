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
  navigation: NativeStackNavigationProp<AuthStackParamList, "Signup">;
};

export const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const { signup, isLoading } = useAuthStore();

  const validate = () => {
    const e: typeof errors = {};
    if (name.trim().length < 2) e.name = "Name must be at least 2 characters";
    if (!email.includes("@")) e.email = "Enter a valid email";
    if (password.length < 6) e.password = "Minimum 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    await signup(name.trim(), email, password);
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
          <View className="flex-1 px-6 pt-6 pb-6">
            {/* Header */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 items-center justify-center bg-slate-800 rounded-xl mb-8"
            >
              <Ionicons name="arrow-back" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View className="mb-8">
              <Text className="text-white text-3xl font-bold mb-1">
                Create account ✨
              </Text>
              <Text className="text-slate-400 text-sm">
                Join thousands of students using AI to study
              </Text>
            </View>

            {/* Stats row */}
            <View className="flex-row gap-3 mb-8">
              {[
                { label: "Students", value: "50K+" },
                { label: "Subjects", value: "200+" },
                { label: "Quizzes", value: "1M+" },
              ].map((stat) => (
                <View
                  key={stat.label}
                  className="flex-1 bg-slate-800 rounded-2xl p-3 items-center border border-slate-700/50"
                >
                  <Text className="text-indigo-400 font-bold text-lg">
                    {stat.value}
                  </Text>
                  <Text className="text-slate-500 text-xs">{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Form */}
            <Input
              label="Full Name"
              placeholder="John Doe"
              leftIcon="person-outline"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
              error={errors.name}
            />

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
              placeholder="Min. 6 characters"
              leftIcon="lock-closed-outline"
              isPassword
              value={password}
              onChangeText={setPassword}
              error={errors.password}
            />

            <Text className="text-slate-500 text-xs mb-6">
              By signing up, you agree to our{" "}
              <Text className="text-indigo-400">Terms of Service</Text> and{" "}
              <Text className="text-indigo-400">Privacy Policy</Text>.
            </Text>

            <Button
              title="Create Account"
              onPress={handleSignup}
              isLoading={isLoading}
            />

            <View className="flex-row justify-center mt-6">
              <Text className="text-slate-400 text-sm">
                Already have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text className="text-indigo-400 text-sm font-semibold">
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
