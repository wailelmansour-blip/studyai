// app/quiz.tsx
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export default function QuizScreen() {
  const app = getApp();
  const auth = getAuth(app);
  const functions = getFunctions(app, "us-central1");

  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("5");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"setup" | "playing" | "result">("setup");
  const [generating, setGenerating] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const handleGenerate = async () => {
    if (topic.trim().length < 2) {
      Alert.alert("Erreur", "Saisis un sujet pour le quiz.");
      return;
    }
    setGenerating(true);
    try {
      const fn = httpsCallable(functions, "generateQuiz");
      const res = await fn({ topic, count: parseInt(count) });
      const data = res.data as any;
      const qs: QuizQuestion[] = data.questions || [];
      if (qs.length === 0) throw new Error("Aucune question générée.");
      setQuestions(qs);
      setCurrentIndex(0);
      setScore(0);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setPhase("playing");
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Génération échouée.");
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    setShowAnswer(true);
    if (index === questions[currentIndex].correct) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
    } else {
      setPhase("result");
    }
  };

  const handleReset = () => {
    setPhase("setup");
    setTopic("");
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowAnswer(false);
  };

  const q = questions[currentIndex];

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
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827" }}>Quiz IA</Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>GPT-4o-mini</Text>
          </View>
        </View>

        {/* Setup */}
        {phase === "setup" && (
          <View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
              🧠 Sujet du quiz
            </Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="Ex: La Révolution française, Pythagore..."
              placeholderTextColor="#9CA3AF"
              style={{
                backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E7EB",
                borderRadius: 12, padding: 14, fontSize: 15, color: "#111827", marginBottom: 20,
              }}
            />
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 10 }}>
              ❓ Nombre de questions
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 28 }}>
              {["3", "5", "10"].map((n) => (
                <TouchableOpacity key={n} onPress={() => setCount(n)} style={{
                  flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
                  backgroundColor: count === n ? "#6366F1" : "#FFF",
                  borderWidth: 1, borderColor: count === n ? "#6366F1" : "#E5E7EB",
                }}>
                  <Text style={{ fontWeight: "600", fontSize: 15, color: count === n ? "#FFF" : "#374151" }}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={handleGenerate} disabled={generating} style={{
              backgroundColor: generating ? "#A5B4FC" : "#6366F1",
              borderRadius: 14, padding: 16, alignItems: "center", elevation: 4,
            }}>
              {generating ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 10 }}>
                    Génération...
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="sparkles" size={20} color="#FFF" />
                  <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>
                    Générer le quiz
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Playing */}
        {phase === "playing" && q && (
          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                Question {currentIndex + 1}/{questions.length}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#6366F1" }}>
                Score : {score}
              </Text>
            </View>
            <View style={{ height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, marginBottom: 20 }}>
              <View style={{
                height: 4, borderRadius: 2, backgroundColor: "#6366F1",
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
              }} />
            </View>

            <View style={{
              backgroundColor: "#EEF2FF", borderRadius: 14, padding: 20, marginBottom: 20,
            }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#3730A3", lineHeight: 24 }}>
                {q.question}
              </Text>
            </View>

            {q.options.map((option, i) => {
              let bg = "#FFF", border = "#E5E7EB", textColor = "#374151";
              if (showAnswer) {
                if (i === q.correct) { bg = "#F0FDF4"; border = "#10B981"; textColor = "#065F46"; }
                else if (i === selectedAnswer) { bg = "#FEF2F2"; border = "#EF4444"; textColor = "#991B1B"; }
              } else if (selectedAnswer === i) {
                bg = "#EEF2FF"; border = "#6366F1"; textColor = "#3730A3";
              }
              return (
                <TouchableOpacity key={i} onPress={() => handleAnswer(i)} style={{
                  backgroundColor: bg, borderWidth: 1.5, borderColor: border,
                  borderRadius: 12, padding: 14, marginBottom: 10,
                  flexDirection: "row", alignItems: "center",
                }}>
                  <View style={{
                    width: 28, height: 28, borderRadius: 14, backgroundColor: border + "30",
                    alignItems: "center", justifyContent: "center", marginRight: 12,
                  }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: border }}>
                      {String.fromCharCode(65 + i)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, color: textColor, flex: 1 }}>{option}</Text>
                  {showAnswer && i === q.correct && (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  )}
                  {showAnswer && i === selectedAnswer && i !== q.correct && (
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  )}
                </TouchableOpacity>
              );
            })}

            {showAnswer && q.explanation && (
              <View style={{
                backgroundColor: "#FFFBEB", borderRadius: 12, padding: 14,
                marginTop: 4, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: "#F59E0B",
              }}>
                <Text style={{ fontSize: 13, color: "#92400E", lineHeight: 20 }}>
                  💡 {q.explanation}
                </Text>
              </View>
            )}

            {showAnswer && (
              <TouchableOpacity onPress={handleNext} style={{
                backgroundColor: "#6366F1", borderRadius: 14, padding: 16, alignItems: "center",
              }}>
                <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
                  {currentIndex < questions.length - 1 ? "Question suivante →" : "Voir les résultats"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Result */}
        {phase === "result" && (
          <View style={{ alignItems: "center" }}>
            <View style={{
              width: 100, height: 100, borderRadius: 50, backgroundColor: "#EEF2FF",
              alignItems: "center", justifyContent: "center", marginBottom: 20,
            }}>
              <Text style={{ fontSize: 36 }}>
                {score >= questions.length * 0.8 ? "🏆" : score >= questions.length * 0.5 ? "👍" : "💪"}
              </Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
              {score}/{questions.length}
            </Text>
            <Text style={{ fontSize: 15, color: "#6B7280", marginBottom: 32, textAlign: "center" }}>
              {score >= questions.length * 0.8
                ? "Excellent ! Tu maîtrises le sujet."
                : score >= questions.length * 0.5
                ? "Bien ! Continue à réviser."
                : "Continue tes efforts, tu progresseras !"}
            </Text>
            <TouchableOpacity onPress={handleReset} style={{
              backgroundColor: "#6366F1", borderRadius: 14, padding: 16,
              alignItems: "center", width: "100%",
            }}>
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
                🔄 Nouveau quiz
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}