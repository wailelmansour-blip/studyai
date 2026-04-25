import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { callGenerateQuiz, QuizQuestion } from "../../services/functionsService";
import { createQuiz, saveQuizScore } from "../../services/quizzesService";

// ── Types ─────────────────────────────────────────────────────────────────────
type QuizPhase = "setup" | "playing" | "result";

export default function QuizScreen() {
  const { user } = useAuthStore();

  // ── State ──────────────────────────────────────────────────────
  const [phase, setPhase]             = useState<QuizPhase>("setup");
  const [topic, setTopic]             = useState("");
  const [count, setCount]             = useState(5);
  const [questions, setQuestions]     = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers]         = useState<number[]>([]);
  const [score, setScore]             = useState(0);
  const [isLoading, setIsLoading]     = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [isSaved, setIsSaved]         = useState(false);
  const [error, setError]             = useState("");
  const [quizId, setQuizId]           = useState<string | null>(null);
  const [showAnswer, setShowAnswer]   = useState(false);

  // ── Generate Quiz ──────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!user) return;
    if (!topic.trim()) {
      setError("Veuillez entrer un sujet.");
      return;
    }
    if (topic.trim().length > 200) {
      setError("Le sujet est trop long (max 200 car.).");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      // Call Cloud Function
      const result = await callGenerateQuiz(topic.trim(), count);
      if (!result || result.length === 0) {
        throw new Error("Aucune question générée.");
      }
      setQuestions(result);

      // Save quiz to Firestore (without score yet)
      const id = await createQuiz(user.id, result, topic.trim());
      setQuizId(id);

      // Start quiz
      setCurrentIndex(0);
      setAnswers([]);
      setScore(0);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setIsSaved(false);
      setPhase("playing");
    } catch (err: any) {
      const msg = err?.message ?? "Impossible de générer le quiz.";
      setError(msg);
      Alert.alert("Erreur", msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Select Answer ──────────────────────────────────────────────
  const handleSelectAnswer = (index: number) => {
    if (showAnswer) return; // already answered
    setSelectedAnswer(index);
    setShowAnswer(true);

    const isCorrect = index === questions[currentIndex].correct;
    if (isCorrect) setScore((s) => s + 1);
    setAnswers((prev) => [...prev, index]);
  };

  // ── Next Question ──────────────────────────────────────────────
  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setPhase("result");
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
    }
  };

  // ── Save Score ─────────────────────────────────────────────────
  const handleSaveScore = async () => {
    if (!user || !quizId) return;
    setIsSaving(true);
    try {
      const percent = Math.round((score / questions.length) * 100);
      await saveQuizScore(user.id, quizId, percent);
      setIsSaved(true);
      Alert.alert("Sauvegardé !", `Score de ${percent}% enregistré.`);
    } catch (err: any) {
      Alert.alert("Erreur", err?.message ?? "Impossible de sauvegarder.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Restart ────────────────────────────────────────────────────
  const handleRestart = () => {
    setPhase("setup");
    setTopic("");
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setScore(0);
    setSelectedAnswer(null);
    setShowAnswer(false);
    setIsSaved(false);
    setQuizId(null);
    setError("");
  };

  // ── Option color ───────────────────────────────────────────────
  const getOptionStyle = (index: number) => {
    if (!showAnswer) {
      return {
        bg: selectedAnswer === index ? "#1e3a5f" : "#1e293b",
        border: selectedAnswer === index ? "#6366f1" : "#334155",
        textColor: "white",
      };
    }
    const isCorrect = index === questions[currentIndex].correct;
    const isSelected = index === selectedAnswer;
    if (isCorrect) return { bg: "rgba(16,185,129,0.15)", border: "#10b981", textColor: "#34d399" };
    if (isSelected && !isCorrect) return { bg: "rgba(239,68,68,0.15)", border: "#ef4444", textColor: "#f87171" };
    return { bg: "#1e293b", border: "#334155", textColor: "#64748b" };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>

          {/* ══ PHASE : SETUP ══════════════════════════════════════════ */}
          {phase === "setup" && (
            <View>
              {/* Header */}
              <Text style={{ color: "white", fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>
                Quiz IA ✨
              </Text>
              <Text style={{ color: "#64748b", fontSize: 13, marginBottom: 32 }}>
                Entre un sujet et l'IA génère un quiz personnalisé
              </Text>

              {/* Sujet */}
              <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
                Sujet du quiz
              </Text>
              <View style={{
                backgroundColor: "#1e293b", borderRadius: 16,
                borderWidth: 1, borderColor: error ? "#ef4444" : "#334155",
                paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
                flexDirection: "row", alignItems: "center", gap: 10,
              }}>
                <Ionicons name="school-outline" size={20} color="#6366f1" />
                <TextInput
                  placeholder="Ex: Photosynthèse, Révolution française..."
                  placeholderTextColor="#475569"
                  value={topic}
                  onChangeText={(t) => { setTopic(t); setError(""); }}
                  style={{ flex: 1, color: "white", fontSize: 14 }}
                />
              </View>

              {/* Erreur */}
              {error !== "" && (
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 8,
                  backgroundColor: "rgba(239,68,68,0.1)",
                  borderWidth: 1, borderColor: "rgba(239,68,68,0.3)",
                  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                  marginBottom: 16,
                }}>
                  <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                  <Text style={{ color: "#f87171", fontSize: 13, flex: 1 }}>{error}</Text>
                </View>
              )}

              {/* Nombre de questions */}
              <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "600", marginBottom: 12, marginTop: 8 }}>
                Nombre de questions
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 32 }}>
                {[3, 5, 10, 15].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setCount(n)}
                    style={{
                      flex: 1, paddingVertical: 12, borderRadius: 14,
                      alignItems: "center",
                      backgroundColor: count === n ? "#6366f1" : "#1e293b",
                      borderWidth: 1,
                      borderColor: count === n ? "#6366f1" : "#334155",
                    }}
                  >
                    <Text style={{
                      color: count === n ? "white" : "#64748b",
                      fontWeight: "700", fontSize: 15,
                    }}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Bouton Générer */}
              <TouchableOpacity
                onPress={handleGenerate}
                disabled={isLoading || !topic.trim()}
                style={{
                  backgroundColor: isLoading || !topic.trim() ? "#1e293b" : "#6366f1",
                  borderRadius: 16, paddingVertical: 16,
                  alignItems: "center", flexDirection: "row",
                  justifyContent: "center", gap: 8,
                  opacity: isLoading ? 0.7 : 1,
                  borderWidth: 1,
                  borderColor: isLoading || !topic.trim() ? "#334155" : "#6366f1",
                }}
              >
                {isLoading ? (
                  <>
                    <ActivityIndicator size="small" color="#6366f1" />
                    <Text style={{ color: "#6366f1", fontWeight: "700", fontSize: 15 }}>
                      L'IA génère le quiz...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color={topic.trim() ? "white" : "#475569"} />
                    <Text style={{ color: topic.trim() ? "white" : "#475569", fontWeight: "700", fontSize: 15 }}>
                      Générer le quiz
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ══ PHASE : PLAYING ════════════════════════════════════════ */}
          {phase === "playing" && questions.length > 0 && (
            <View>
              {/* Progress */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ color: "#94a3b8", fontSize: 13 }}>
                  Question {currentIndex + 1} / {questions.length}
                </Text>
                <Text style={{ color: "#6366f1", fontWeight: "700", fontSize: 13 }}>
                  Score : {score}
                </Text>
              </View>

              {/* Barre de progression */}
              <View style={{ height: 4, backgroundColor: "#1e293b", borderRadius: 99, marginBottom: 24, overflow: "hidden" }}>
                <View style={{
                  height: 4, borderRadius: 99, backgroundColor: "#6366f1",
                  width: `${((currentIndex + 1) / questions.length) * 100}%` as any,
                }} />
              </View>

              {/* Question */}
              <View style={{
                backgroundColor: "#1e293b", borderRadius: 20,
                padding: 20, marginBottom: 24,
                borderWidth: 1, borderColor: "#334155",
              }}>
                <Text style={{ color: "white", fontSize: 17, fontWeight: "700", lineHeight: 26 }}>
                  {questions[currentIndex].question}
                </Text>
              </View>

              {/* Options */}
              <View style={{ gap: 10, marginBottom: 24 }}>
                {questions[currentIndex].options.map((option, i) => {
                  const style = getOptionStyle(i);
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handleSelectAnswer(i)}
                      disabled={showAnswer}
                      style={{
                        backgroundColor: style.bg,
                        borderRadius: 14, padding: 16,
                        borderWidth: 1.5, borderColor: style.border,
                        flexDirection: "row", alignItems: "center", gap: 12,
                      }}
                    >
                      {/* Lettre A B C D */}
                      <View style={{
                        width: 32, height: 32, borderRadius: 10,
                        backgroundColor: style.border + "30",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Text style={{ color: style.border, fontWeight: "700", fontSize: 14 }}>
                          {["A", "B", "C", "D"][i]}
                        </Text>
                      </View>
                      <Text style={{ color: style.textColor, fontSize: 14, flex: 1, lineHeight: 20 }}>
                        {option}
                      </Text>
                      {/* Icone correct/incorrect */}
                      {showAnswer && i === questions[currentIndex].correct && (
                        <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                      )}
                      {showAnswer && i === selectedAnswer && i !== questions[currentIndex].correct && (
                        <Ionicons name="close-circle" size={22} color="#ef4444" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Bouton Suivant */}
              {showAnswer && (
                <TouchableOpacity
                  onPress={handleNext}
                  style={{
                    backgroundColor: "#6366f1", borderRadius: 16,
                    paddingVertical: 16, alignItems: "center",
                    flexDirection: "row", justifyContent: "center", gap: 8,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                    {currentIndex + 1 >= questions.length ? "Voir le résultat" : "Question suivante"}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="white" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ══ PHASE : RESULT ═════════════════════════════════════════ */}
          {phase === "result" && (
            <View style={{ alignItems: "center" }}>

              {/* Score circle */}
              <View style={{
                width: 140, height: 140, borderRadius: 70,
                backgroundColor: "#1e293b",
                borderWidth: 4,
                borderColor: score / questions.length >= 0.8 ? "#10b981"
                           : score / questions.length >= 0.5 ? "#f59e0b"
                           : "#ef4444",
                alignItems: "center", justifyContent: "center", marginBottom: 24,
              }}>
                <Text style={{
                  color: "white", fontSize: 40, fontWeight: "bold",
                }}>
                  {score}/{questions.length}
                </Text>
                <Text style={{ color: "#64748b", fontSize: 12 }}>
                  {Math.round((score / questions.length) * 100)}%
                </Text>
              </View>

              {/* Message */}
              <Text style={{ color: "white", fontSize: 22, fontWeight: "bold", marginBottom: 8, textAlign: "center" }}>
                {score / questions.length >= 0.8 ? "Excellent ! 🎉"
               : score / questions.length >= 0.5 ? "Bien joué ! 👍"
               : "Continue à pratiquer ! 💪"}
              </Text>
              <Text style={{ color: "#64748b", fontSize: 14, marginBottom: 32, textAlign: "center" }}>
                Sujet : {topic}
              </Text>

              {/* Recap des réponses */}
              <View style={{ width: "100%", gap: 8, marginBottom: 32 }}>
                {questions.map((q, i) => {
                  const isCorrect = answers[i] === q.correct;
                  return (
                    <View
                      key={i}
                      style={{
                        backgroundColor: "#1e293b", borderRadius: 14,
                        padding: 14, flexDirection: "row",
                        alignItems: "flex-start", gap: 12,
                        borderWidth: 1,
                        borderColor: isCorrect ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)",
                      }}
                    >
                      <Ionicons
                        name={isCorrect ? "checkmark-circle" : "close-circle"}
                        size={20}
                        color={isCorrect ? "#10b981" : "#ef4444"}
                        style={{ marginTop: 2 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "white", fontSize: 13, fontWeight: "600", marginBottom: 4 }} numberOfLines={2}>
                          {q.question}
                        </Text>
                        <Text style={{ color: isCorrect ? "#34d399" : "#f87171", fontSize: 12 }}>
                          {isCorrect ? "✓ Correct" : `✗ Réponse : ${q.options[q.correct]}`}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Bouton Sauvegarder */}
              {!isSaved ? (
                <TouchableOpacity
                  onPress={handleSaveScore}
                  disabled={isSaving}
                  style={{
                    backgroundColor: "#10b981", borderRadius: 16,
                    paddingVertical: 14, width: "100%",
                    alignItems: "center", flexDirection: "row",
                    justifyContent: "center", gap: 8,
                    opacity: isSaving ? 0.7 : 1, marginBottom: 12,
                  }}
                >
                  {isSaving
                    ? <ActivityIndicator size="small" color="white" />
                    : <Ionicons name="save-outline" size={18} color="white" />
                  }
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                    {isSaving ? "Sauvegarde..." : "Sauvegarder le score"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                  backgroundColor: "rgba(16,185,129,0.1)",
                  borderWidth: 1, borderColor: "rgba(16,185,129,0.3)",
                  borderRadius: 16, paddingVertical: 14, width: "100%", marginBottom: 12,
                }}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#10b981" />
                  <Text style={{ color: "#34d399", fontWeight: "700", fontSize: 15 }}>
                    Score sauvegardé !
                  </Text>
                </View>
              )}

              {/* Bouton Nouveau Quiz */}
              <TouchableOpacity
                onPress={handleRestart}
                style={{
                  backgroundColor: "#1e293b", borderRadius: 16,
                  paddingVertical: 14, width: "100%",
                  alignItems: "center", flexDirection: "row",
                  justifyContent: "center", gap: 8,
                  borderWidth: 1, borderColor: "#334155",
                }}
              >
                <Ionicons name="refresh-outline" size={18} color="#6366f1" />
                <Text style={{ color: "#6366f1", fontWeight: "700", fontSize: 15 }}>
                  Nouveau Quiz
                </Text>
              </TouchableOpacity>

            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}