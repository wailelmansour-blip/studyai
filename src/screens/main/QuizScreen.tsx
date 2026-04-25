import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components";
import { useAuthStore } from "../../store/authStore";
import { callGenerateQuiz, QuizQuestion } from "../../services/functionsService";
import { createQuiz, saveQuizScore } from "../../services/quizzesService";

type QuizPhase = "setup" | "playing" | "result";

export const QuizScreen: React.FC = () => {
  const { user } = useAuthStore();

  const [phase, setPhase]                   = useState<QuizPhase>("setup");
  const [topic, setTopic]                   = useState("");
  const [count, setCount]                   = useState(5);
  const [questions, setQuestions]           = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex]     = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers]               = useState<number[]>([]);
  const [score, setScore]                   = useState(0);
  const [showAnswer, setShowAnswer]         = useState(false);
  const [isLoading, setIsLoading]           = useState(false);
  const [isSaving, setIsSaving]             = useState(false);
  const [isSaved, setIsSaved]               = useState(false);
  const [error, setError]                   = useState("");
  const [quizId, setQuizId]                 = useState<string | null>(null);

  // ── Generate Quiz ──────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!user) return;
    if (!topic.trim()) { setError("Veuillez entrer un sujet."); return; }
    setError("");
    setIsLoading(true);
    try {
      const result = await callGenerateQuiz(topic.trim(), count);
      if (!result?.length) throw new Error("Aucune question générée.");
      setQuestions(result);
      const id = await createQuiz(user.id, result, topic.trim());
      setQuizId(id);
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
    if (showAnswer) return;
    setSelectedAnswer(index);
    setShowAnswer(true);
    if (index === questions[currentIndex].correct) setScore((s) => s + 1);
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

  // ── Option style ───────────────────────────────────────────────
  const getOptionStyle = (index: number) => {
    if (!showAnswer) return {
      border: selectedAnswer === index ? "border-indigo-500" : "border-slate-700",
      text: "text-white",
      icon: null,
    };
    const isCorrect = index === questions[currentIndex].correct;
    const isSelected = index === selectedAnswer;
    if (isCorrect) return { border: "border-emerald-500", text: "text-emerald-400", icon: "checkmark-circle" as const };
    if (isSelected) return { border: "border-red-500", text: "text-red-400", icon: "close-circle" as const };
    return { border: "border-slate-700", text: "text-slate-500", icon: null };
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-4 pb-10">

          {/* ══ SETUP ══ */}
          {phase === "setup" && (
            <View>
              <Text className="text-white text-2xl font-bold mb-1">Quiz IA ✨</Text>
              <Text className="text-slate-400 text-sm mb-8">
                Entre un sujet et l'IA génère un quiz personnalisé
              </Text>

              {/* Sujet */}
              <Text className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">
                Sujet du quiz
              </Text>
              <Card className={`mb-3 ${error ? "border-red-500" : "border-slate-700"}`}>
                <View className="flex-row items-center gap-3">
                  <Ionicons name="school-outline" size={20} color="#6366f1" />
                  <TextInput
                    placeholder="Ex: Photosynthèse, Révolution française..."
                    placeholderTextColor="#475569"
                    value={topic}
                    onChangeText={(t) => { setTopic(t); setError(""); }}
                    className="flex-1 text-white text-sm"
                  />
                </View>
              </Card>

              {/* Erreur */}
              {error !== "" && (
                <View className="flex-row items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
                  <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                  <Text className="text-red-400 text-xs flex-1">{err