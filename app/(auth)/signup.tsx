// app/(auth)/signup.tsx
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuthStore } from "@/store/authStore";

const getPasswordStrength = (pwd: string): { label: string; color: string; score: number } => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { label: "Faible", color: "#EF4444", score };
  if (score === 2) return { label: "Moyen", color: "#F59E0B", score };
  if (score === 3) return { label: "Bien", color: "#10B981", score };
  return { label: "Fort", color: "#6366F1", score };
};

export default function SignupScreen() {
  const { signup, isLoading, error, clearError } = useAuthStore();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState<Date>(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const strength = getPasswordStrength(password);

  const formatDate = (date: Date) =>
    `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

  const handleSignup = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Erreur", "Prénom et nom requis.");
      return;
    }
    if (!email.trim() || !password.trim()) {
      Alert.alert("Erreur", "Email et mot de passe requis.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Erreur", "Minimum 6 caractères.");
      return;
    }

    clearError();
    try {
      await signup(
        email.trim(),
        password,
        firstName.trim(),
        lastName.trim(),
        birthDate.toISOString().split("T")[0]
      );
      setEmailSent(true);
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") {
        Alert.alert("Compte existant", "Un compte existe déjà avec cet email. Connecte-toi.");
      } else {
        Alert.alert("Inscription échouée", error || e.message || "Réessaie.");
      }
    }
  };

  // ── Écran confirmation email envoyé ──
  if (emailSent) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }}>
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: "#EEF2FF", alignItems: "center",
            justifyContent: "center", marginBottom: 20,
          }}>
            <Ionicons name="mail-outline" size={40} color="#6366F1" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: "700", color: "#111827", textAlign: "center" }}>
            Inscription réussie ! 🎉
          </Text>
          <Text style={{ fontSize: 15, color: "#6B7280", marginTop: 12, textAlign: "center", lineHeight: 22 }}>
            Un email de vérification a été envoyé à{"\n"}
            <Text style={{ fontWeight: "600", color: "#374151" }}>{email}</Text>
          </Text>
        </View>

        {/* Message spam */}
        <View style={{
          backgroundColor: "#FFFBEB", borderRadius: 12, padding: 14,
          marginBottom: 24, borderWidth: 1, borderColor: "#FCD34D",
        }}>
          <Text style={{ fontSize: 13, color: "#92400E", lineHeight: 20 }}>
            📬 Vérifie aussi ton dossier <Text style={{ fontWeight: "700" }}>Spam</Text> ou <Text style={{ fontWeight: "700" }}>Courrier indésirable</Text> si tu ne reçois pas l'email dans les 2 minutes.
          </Text>
        </View>

        {/* Étapes */}
        <View style={{
          backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16,
          marginBottom: 24, borderWidth: 1, borderColor: "#E5E7EB",
        }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 12 }}>
            Comment activer ton compte :
          </Text>
          {[
            "1. Ouvre l'email reçu",
            "2. Clique sur le lien de vérification",
            "3. Reviens ici et connecte-toi",
          ].map((step, i) => (
            <Text key={i} style={{ fontSize: 13, color: "#374151", marginBottom: 6, lineHeight: 20 }}>
              {step}
            </Text>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          style={{
            backgroundColor: "#6366F1", borderRadius: 14,
            padding: 16, alignItems: "center", marginBottom: 12,
          }}
        >
          <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
            Aller à la connexion
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ alignItems: "center", padding: 8 }}
        >
          <Text style={{ fontSize: 14, color: "#6B7280" }}>Retour</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 40, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginBottom: 24, alignSelf: "flex-start" }}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827" }}>
              Créer un compte
            </Text>
            <Text style={{ fontSize: 15, color: "#6B7280", marginTop: 6 }}>
              Rejoins StudyAI gratuitement
            </Text>
          </View>

          {/* Prénom */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
            Prénom
          </Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Ton prénom"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
            style={{
              backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
              borderRadius: 12, padding: 14, fontSize: 15, color: "#111827",
              marginBottom: 16,
            }}
          />

          {/* Nom */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
            Nom
          </Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Ton nom"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
            style={{
              backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
              borderRadius: 12, padding: 14, fontSize: 15, color: "#111827",
              marginBottom: 16,
            }}
          />

          {/* Date de naissance */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
            Date de naissance
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={{
              backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
              borderRadius: 12, padding: 14, marginBottom: 16,
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 15, color: "#111827" }}>
              {formatDate(birthDate)}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={birthDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setBirthDate(date);
              }}
            />
          )}

          {/* Email */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="ton@email.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            style={{
              backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
              borderRadius: 12, padding: 14, fontSize: 15, color: "#111827",
              marginBottom: 16,
            }}
          />

          {/* Mot de passe */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
            Mot de passe
          </Text>
          <View style={{ position: "relative", marginBottom: 8 }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              style={{
                backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
                borderRadius: 12, padding: 14, paddingRight: 48,
                fontSize: 15, color: "#111827",
              }}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ position: "absolute", right: 14, top: 14 }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22} color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          {/* Indicateur force */}
          {password.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 4, marginBottom: 4 }}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1, height: 4, borderRadius: 2,
                      backgroundColor: i < strength.score ? strength.color : "#E5E7EB",
                    }}
                  />
                ))}
              </View>
              <Text style={{ fontSize: 12, color: strength.color, fontWeight: "600" }}>
                Mot de passe {strength.label}
              </Text>
            </View>
          )}

          {/* Confirmer */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
            Confirmer le mot de passe
          </Text>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            style={{
              backgroundColor: "#FFFFFF", borderWidth: 1,
              borderColor: confirm.length > 0 && confirm !== password ? "#EF4444" : "#E5E7EB",
              borderRadius: 12, padding: 14, fontSize: 15, color: "#111827",
              marginBottom: confirm.length > 0 && confirm !== password ? 4 : 28,
            }}
          />
          {confirm.length > 0 && confirm !== password && (
            <Text style={{ fontSize: 12, color: "#EF4444", marginBottom: 24 }}>
              Les mots de passe ne correspondent pas
            </Text>
          )}

          <TouchableOpacity
            onPress={handleSignup}
            disabled={isLoading}
            style={{
              backgroundColor: isLoading ? "#A5B4FC" : "#6366F1",
              borderRadius: 14, padding: 16, alignItems: "center",
              elevation: 4, marginBottom: 16,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
                Créer mon compte
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            style={{ alignItems: "center", padding: 8 }}
          >
            <Text style={{ fontSize: 14, color: "#6B7280" }}>
              Déjà un compte ?{" "}
              <Text style={{ color: "#6366F1", fontWeight: "600" }}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}