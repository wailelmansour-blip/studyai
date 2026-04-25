// app/flashcards.tsx
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
/*import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useAiStore } from "@/store/aiStore";
import { FlashcardsResult, Flashcard } from "@/types/ai";*/
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { app } from "../src/lib/firebase";
import { useAiStore } from "../store/aiStore";
import { FlashcardsResult, Flashcard } from "../types/ai";

const functions = getFunctions(app, "us-central1");

export default function FlashcardsScreen() {
  const { saveFlashcards, isLoading } = useAiStore();
  const auth = getAuth(app);

  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("8");
  const [result, setResult] = useState<FlashcardsResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [currentCard, setCurrentCard] = useState(0);

  const handleGenerate = async () => {
    if (topic.trim().length < 3) {
      Alert.alert("Erreur", "Saisis un sujet pour les flashcards.");
      return;
    }
    setGenerating(true);
    setResult(null);
    setSaved(false);
    setFlipped({});
    setCurrentCard(0);
    try {
      const fn = httpsCallable(functions, "generateFlashcards");
      const res = await fn({ topic, count: parseInt(count) });
      const data = res.data as any;
      setResult({
        userId: auth.currentUser?.uid || "anonymous",
        topic,
        flashcards: data.flashcards || [],
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
      await saveFlashcards(result);
      setSaved(true);
      Alert.alert("✅ Sauvegardé", "Les flashcards ont été enregistrées.");
    } catch {
      Alert.alert("Erreur", "La sauvegarde a échoué.");
    }
  };

  const toggleFlip = (index: number) => {
    setFlipped((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const card = result?.flashcards[currentCard];
  const total = result?.flashcards.length || 0;

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
              Flashcards IA
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
              Mémorisation · GPT-4o-mini
            </Text>
          </View>
        </View>

        {/* Form */}
        {!result && (
          <View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
              🧠 Sujet des flashcards
            </Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="Ex: La Révolution française, Les lois de Newton..."
              placeholderTextColor="#9CA3AF"
              style={{
                backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
                borderRadius: 12, padding: 14, fontSize: 14, color: "#111827",
                marginBottom: 20,
              }}
            />

            <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 10 }}>
              🃏 Nombre de cartes
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 28 }}>
              {["5", "8", "10", "15", "20"].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setCount(n)}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
                    backgroundColor: count === n ? "#6366F1" : "#FFFFFF",
                    borderWidth: 1, borderColor: count === n ? "#6366F1" : "#E5E7EB",
                  }}
                >
                  <Text style={{
                    fontWeight: "600", fontSize: 15,
                    color: count === n ? "#FFFFFF" : "#374151",
                  }}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleGenerate}
              disabled={generating}
              style={{
                backgroundColor: generating ? "#A5B4FC" : "#6366F1",
                borderRadius: 14, padding: 16, alignItems: "center", elevation: 4,
              }}
            >
              {generating ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 10 }}>
                    Génération en cours...
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="layers-outline" size={20} color="#FFF" />
                  <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>
                    Générer les flashcards
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Résultat — mode carte interactive */}
        {result && card && (
          <View>
            {/* Compteur */}
            <View style={{
              flexDirection: "row", justifyContent: "space-between",
              alignItems: "center", marginBottom: 16,
            }}>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                📚 {result.topic}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#6366F1" }}>
                {currentCard + 1} / {total}
              </Text>
            </View>

            {/* Carte principale — tap pour retourner */}
            <TouchableOpacity
              onPress={() => toggleFlip(currentCard)}
              activeOpacity={0.85}
              style={{
                backgroundColor: flipped[currentCard] ? "#6366F1" : "#FFFFFF",
                borderRadius: 20, padding: 32, minHeight: 200,
                alignItems: "center", justifyContent: "center",
                marginBottom: 16, elevation: 4,
                borderWidth: 1,
                borderColor: flipped[currentCard] ? "#6366F1" : "#E5E7EB",
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: "600", marginBottom: 16,
                color: flipped[currentCard] ? "#C7D2FE" : "#9CA3AF",
                textTransform: "uppercase", letterSpacing: 1,
              }}>
                {flipped[currentCard] ? "RÉPONSE" : "QUESTION"}
              </Text>
              <Text style={{
                fontSize: 16, fontWeight: "600", textAlign: "center", lineHeight: 24,
                color: flipped[currentCard] ? "#FFFFFF" : "#111827",
              }}>
                {flipped[currentCard] ? card.answer : card.question}
              </Text>
              <Text style={{
                fontSize: 12, marginTop: 20,
                color: flipped[currentCard] ? "#C7D2FE" : "#9CA3AF",
              }}>
                Appuie pour retourner
              </Text>
            </TouchableOpacity>

            {/* Navigation */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => {
                  if (currentCard > 0) {
                    setCurrentCard(currentCard - 1);
                    setFlipped((prev) => ({ ...prev, [currentCard]: false }));
                  }
                }}
                disabled={currentCard === 0}
                style={{
                  flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
                  backgroundColor: currentCard === 0 ? "#F9FAFB" : "#F3F4F6",
                  borderWidth: 1, borderColor: "#E5E7EB",
                }}
              >
                <Text style={{
                  fontWeight: "600", fontSize: 15,
                  color: currentCard === 0 ? "#D1D5DB" : "#374151",
                }}>
                  ← Précédente
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (currentCard < total - 1) {
                    setCurrentCard(currentCard + 1);
                    setFlipped((prev) => ({ ...prev, [currentCard]: false }));
                  }
                }}
                disabled={currentCard === total - 1}
                style={{
                  flex: 1, borderRadius: 12, padding: 14, alignItems: "center",
                  backgroundColor: currentCard === total - 1 ? "#F9FAFB" : "#6366F1",
                  borderWidth: 1,
                  borderColor: currentCard === total - 1 ? "#E5E7EB" : "#6366F1",
                }}
              >
                <Text style={{
                  fontWeight: "600", fontSize: 15,
                  color: currentCard === total - 1 ? "#D1D5DB" : "#FFFFFF",
                }}>
                  Suivante →
                </Text>
              </TouchableOpacity>
            </View>

            {/* Barre de progression */}
            <View style={{
              height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, marginBottom: 20,
            }}>
              <View style={{
                height: 4, borderRadius: 2, backgroundColor: "#6366F1",
                width: `${((currentCard + 1) / total) * 100}%`,
              }} />
            </View>

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => { setResult(null); setSaved(false); setTopic(""); }}
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