// app/explain.tsx
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
/*import { app } from "@/lib/firebase";
import { useAiStore } from "@/store/aiStore";
import { ExplainResult } from "@/types/ai";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";*/
import app from "../src/services/firebase";
import { useAiStore } from "../store/aiStore";
import { ExplainResult } from "../types/ai";

const functions = getFunctions(app, "us-central1");

export default function ExplainScreen() {
  const { saveExplanation, isLoading } = useAiStore();
  const auth = getAuth(app);

  const [text, setText] = useState("");
  const [difficulty, setDifficulty] = useState<"facile" | "moyen" | "difficile">("moyen");
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleExplain = async () => {
    if (text.trim().length < 10) {
      Alert.alert("Erreur", "Saisis au moins 10 caractères.");
      return;
    }
    setGenerating(true);
    setResult(null);
    setSaved(false);
    try {
      const fn = httpsCallable(functions, "explainText");
      const res = await fn({ text, difficulty });
      const data = res.data as any;
      setResult({
        userId: auth.currentUser?.uid || "anonymous",
        inputText: text,
        explanation: data.explanation || "",
        keyPoints: data.keyPoints || [],
        difficulty: data.difficulty || difficulty,
        createdAt: new Date().toISOString(),
      });
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "La génération a échoué.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await saveExplanation(result);
      setSaved(true);
      Alert.alert("✅ Sauvegardé", "L'explication a été enregistrée.");
    } catch {
      Alert.alert("Erreur", "La sauvegarde a échoué.");
    }
  };

  const difficultyColors: Record<string, string> = {
    facile: "#10B981",
    moyen: "#F59E0B",
    difficile: "#EF4444",
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
              Expliquer un texte
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
              Analyse IA · GPT-4o-mini
            </Text>
          </View>
        </View>

        {/* Input */}
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
          📝 Texte à expliquer
        </Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Colle ou tape le texte à expliquer..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={6}
          style={{
            backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
            borderRadius: 12, padding: 14, fontSize: 14, color: "#111827",
            minHeight: 140, textAlignVertical: "top", marginBottom: 20,
          }}
        />

        {/* Niveau */}
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 10 }}>
          🎯 Niveau d'explication
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
          {(["facile", "moyen", "difficile"] as const).map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => setDifficulty(d)}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
                backgroundColor: difficulty === d ? difficultyColors[d] : "#FFFFFF",
                borderWidth: 1,
                borderColor: difficulty === d ? difficultyColors[d] : "#E5E7EB",
              }}
            >
              <Text style={{
                fontWeight: "600", fontSize: 13,
                color: difficulty === d ? "#FFFFFF" : "#374151",
              }}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bouton */}
        <TouchableOpacity
          onPress={handleExplain}
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
                Analyse en cours...
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="bulb-outline" size={20} color="#FFF" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>
                Expliquer avec l'IA
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Résultat */}
        {result && (
          <View>
            {/* Explication */}
            <View style={{
              backgroundColor: "#EEF2FF", borderRadius: 14, padding: 16, marginBottom: 14,
              borderLeftWidth: 4, borderLeftColor: "#6366F1",
            }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#3730A3", marginBottom: 8 }}>
                💡 Explication
              </Text>
              <Text style={{ fontSize: 14, color: "#3730A3", lineHeight: 22 }}>
                {result.explanation}
              </Text>
            </View>

            {/* Points clés */}
            {result.keyPoints.length > 0 && (
              <View style={{
                backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16,
                marginBottom: 14, borderWidth: 1, borderColor: "#E5E7EB",
              }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 10 }}>
                  🔑 Points clés
                </Text>
                {result.keyPoints.map((point, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 6 }}>
                    <View style={{
                      width: 20, height: 20, borderRadius: 10, backgroundColor: "#EEF2FF",
                      alignItems: "center", justifyContent: "center", marginRight: 10, marginTop: 1,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#6366F1" }}>
                        {i + 1}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: "#374151", flex: 1, lineHeight: 20 }}>
                      {point}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Badge difficulté */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{
                backgroundColor: difficultyColors[result.difficulty] + "20",
                borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
              }}>
                <Text style={{
                  fontSize: 13, fontWeight: "600",
                  color: difficultyColors[result.difficulty],
                }}>
                  Niveau : {result.difficulty}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => { setResult(null); setSaved(false); setText(""); }}
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