// app/solve.tsx
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useAiStore } from "@/store/aiStore";
import { SolveResult } from "@/types/ai";

const functions = getFunctions(app, "us-central1");

export default function SolveScreen() {
  const { saveSolution, isLoading } = useAiStore();
  const auth = getAuth(app);

  const [exercise, setExercise] = useState("");
  const [subject, setSubject] = useState("");
  const [result, setResult] = useState<SolveResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);

  const SUBJECTS = ["Maths", "Physique", "Chimie", "Info", "Autre"];

  const handleSolve = async () => {
    if (exercise.trim().length < 5) {
      Alert.alert("Erreur", "Saisis l'exercice à résoudre.");
      return;
    }
    setGenerating(true);
    setResult(null);
    setSaved(false);
    try {
      const fn = httpsCallable(functions, "solveExercise");
      const res = await fn({ exercise, subject });
      const data = res.data as any;
      setResult({
        userId: auth.currentUser?.uid || "anonymous",
        exercise,
        solution: data.solution || "",
        steps: data.steps || [],
        subject: data.subject || subject || "Général",
        createdAt: new Date().toISOString(),
      });
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "La résolution a échoué.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await saveSolution(result);
      setSaved(true);
      Alert.alert("✅ Sauvegardé", "La solution a été enregistrée.");
    } catch {
      Alert.alert("Erreur", "La sauvegarde a échoué.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827" }}>
              Résoudre un exercice
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
              Solution IA · GPT-4o-mini
            </Text>
          </View>
        </View>

        {/* Matière */}
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 10 }}>
          📚 Matière
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {SUBJECTS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSubject(s === subject ? "" : s)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: subject === s ? "#6366F1" : "#FFFFFF",
                  borderWidth: 1, borderColor: subject === s ? "#6366F1" : "#E5E7EB",
                }}
              >
                <Text style={{
                  fontSize: 14, fontWeight: "500",
                  color: subject === s ? "#FFFFFF" : "#374151",
                }}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Exercice */}
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
          ✏️ Exercice à résoudre
        </Text>
        <TextInput
          value={exercise}
          onChangeText={setExercise}
          placeholder="Colle ou tape l'exercice ici..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={6}
          style={{
            backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
            borderRadius: 12, padding: 14, fontSize: 14, color: "#111827",
            minHeight: 140, textAlignVertical: "top", marginBottom: 24,
          }}
        />

        {/* Bouton */}
        <TouchableOpacity
          onPress={handleSolve}
          disabled={generating}
          style={{
            backgroundColor: generating ? "#A5B4FC" : "#6366F1",
            borderRadius: 14, padding: 16, alignItems: "center",
            elevation: 4, marginBottom: 24,
          }}
        >
          {generating ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 10 }}>
                Résolution en cours...
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="calculator-outline" size={20} color="#FFF" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>
                Résoudre avec l'IA
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Résultat */}
        {result && (
          <View>
            {/* Matière détectée */}
            <View style={{
              flexDirection: "row", alignItems: "center", marginBottom: 14,
            }}>
              <View style={{
                backgroundColor: "#EEF2FF", borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 6,
              }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#6366F1" }}>
                  📚 {result.subject}
                </Text>
              </View>
            </View>

            {/* Étapes */}
            {result.steps.length > 0 && (
              <View style={{
                backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16,
                marginBottom: 14, borderWidth: 1, borderColor: "#E5E7EB",
              }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 12 }}>
                  🪜 Étapes de résolution
                </Text>
                {result.steps.map((step, i) => (
                  <View key={i} style={{
                    flexDirection: "row", alignItems: "flex-start",
                    marginBottom: 10, paddingBottom: 10,
                    borderBottomWidth: i < result.steps.length - 1 ? 1 : 0,
                    borderBottomColor: "#F3F4F6",
                  }}>
                    <View style={{
                      width: 24, height: 24, borderRadius: 12, backgroundColor: "#6366F1",
                      alignItems: "center", justifyContent: "center",
                      marginRight: 10, marginTop: 1, flexShrink: 0,
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFF" }}>
                        {i + 1}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: "#374151", flex: 1, lineHeight: 20 }}>
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Solution finale */}
            <View style={{
              backgroundColor: "#F0FDF4", borderRadius: 14, padding: 16,
              marginBottom: 16, borderLeftWidth: 4, borderLeftColor: "#10B981",
            }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#065F46", marginBottom: 8 }}>
                ✅ Solution finale
              </Text>
              <Text style={{ fontSize: 14, color: "#065F46", lineHeight: 22 }}>
                {result.solution}
              </Text>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => { setResult(null); setSaved(false); setExercise(""); }}
                style={{
                  flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
                  backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
                }}
              >
                <Text style={{ fontWeight: "600", color: "#374151", fontSize: 15 }}>
                  🔄 Nouveau
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saved || isLoading}
                style={{
                  flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
                  backgroundColor: saved ? "#10B981" : "#6366F1",
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ fontWeight: "600", color: "#FFF", fontSize: 15 }}>
                    {saved ? "✅ Sauvegardé" : "💾 Sauvegarder"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}