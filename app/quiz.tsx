// app/quiz.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  getFirestore, collection, addDoc, Timestamp,
  getDocs, query, where, orderBy, limit, startAfter,
  QueryDocumentSnapshot,
} from "firebase/firestore"; // ← AJOUT
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage"; // ← AJOUT
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../store/languageStore";
import { useAIRequest } from "../hooks/useAIRequest";
import { UsageBanner } from "../components/UsageBanner";
import { readAICache, writeAICache } from "../store/aiCacheStore";
import { limitInput } from "../utils/inputLimiter";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDeleteHistory } from "../hooks/useDeleteHistory";

const CACHE_KEY = "studyai_quizzes"; // ← AJOUT
const CACHE_TTL = 24 * 60 * 60 * 1000; // ← AJOUT
const MAX_CACHE_ITEMS = 10; // ← AJOUT
const PAGE_SIZE = 5; // ← AJOUT

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface CachedQuiz { // ← AJOUT
  id: string;
  userId: string;
  topic: string;
  score: number;
  total: number;
  questions: QuizQuestion[];
  createdAt: string;
}

export default function QuizScreen() {
  const app = getApp();
  const auth = getAuth(app);
  const db = getFirestore(app); // ← AJOUT
  const functions = getFunctions(app, "us-central1");
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const isRTL = currentLanguage === "ar";
  const { checkAndConsume } = useAIRequest();
  const { confirmDeleteOne, confirmDeleteAll } = useDeleteHistory();
  const { startTracking, endTracking, trackView } = useAnalytics("quiz");

  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("5");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"setup" | "playing" | "result">("setup");
  const [generating, setGenerating] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  // ── Historique ────────────────────────────────────────────────── ← AJOUT
  const [cachedQuizzes, setCachedQuizzes] = useState<CachedQuiz[]>([]);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    trackView();

    // ── Charger historique ── ← AJOUT
    const loadCache = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Afficher le cache local immédiatement (UX rapide)
    const raw = await AsyncStorage.getItem(`${CACHE_KEY}_${user.uid}`);
    if (raw) {
      const { data } = JSON.parse(raw);
      if (data?.length > 0) {
        setCachedQuizzes(data);
        setHasMore(data.length >= PAGE_SIZE);
      }
    }

    // 2. Toujours charger Firestore pour avoir les données à jour
    const q = query(
      collection(db, "quizzes"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const fromFirestore: CachedQuiz[] = snap.docs.map((doc) => ({
      id: doc.id,
      userId: doc.data().userId,
      topic: doc.data().topic || "",
      score: doc.data().score || 0,
      total: doc.data().total || 0,
      questions: doc.data().questions || [],
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }));

    // 3. Mettre à jour UI + cache avec données Firestore
    setCachedQuizzes(fromFirestore);
    setLastDoc(snap.docs[snap.docs.length - 1]);
    setHasMore(snap.docs.length === PAGE_SIZE);

    await AsyncStorage.setItem(
      `${CACHE_KEY}_${user.uid}`,
      JSON.stringify({ data: fromFirestore, timestamp: Date.now() })
    );
  } catch (e) {
    console.log("Quiz cache load error:", e);
  }
};
    loadCache();
  }, []);

  // ── Charger plus ── ← AJOUT
  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;
    const user = auth.currentUser;
    if (!user) return;

    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "quizzes"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      if (snap.empty) { setHasMore(false); return; }

      const more: CachedQuiz[] = snap.docs.map((doc) => ({
        id: doc.id,
        userId: doc.data().userId,
        topic: doc.data().topic || "",
        score: doc.data().score || 0,
        total: doc.data().total || 0,
        questions: doc.data().questions || [],
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }));

      const updated = [...cachedQuizzes, ...more];
      setCachedQuizzes(updated);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setDisplayCount((prev) => prev + PAGE_SIZE);

      await AsyncStorage.setItem(
        `${CACHE_KEY}_${user.uid}`,
        JSON.stringify({ data: updated.slice(0, MAX_CACHE_ITEMS), timestamp: Date.now() })
      );
    } catch (e) {
      console.log("Load more quizzes error:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Sauvegarder résultat automatiquement ── ← AJOUT
  const handleSaveResult = async (finalScore: number) => {
    const user = auth.currentUser;
    if (!user || questions.length === 0) return;

    try {
      const newEntry: CachedQuiz = {
        id: Date.now().toString(),
        userId: user.uid,
        topic,
        score: finalScore,
        total: questions.length,
        questions,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "quizzes"), {
        ...newEntry,
        createdAt: Timestamp.now(),
      });

      const updated = [newEntry, ...cachedQuizzes].slice(0, MAX_CACHE_ITEMS);
      setCachedQuizzes(updated);
      setHasMore(updated.length >= PAGE_SIZE);

      await AsyncStorage.setItem(
        `${CACHE_KEY}_${user.uid}`,
        JSON.stringify({ data: updated, timestamp: Date.now() })
      );
    } catch (e) {
      console.log("Quiz save error:", e);
    }
  };

  // ── Rejouer un quiz depuis l'historique ── ← AJOUT
  const handleReplay = (item: CachedQuiz) => {
    setTopic(item.topic);
    setQuestions(item.questions);
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowAnswer(false);
    setPhase("playing");
  };

  const getMoreLabel = () => {
    if (currentLanguage === "ar") return "عرض المزيد";
    if (currentLanguage === "en") return "Show more";
    return "Voir plus";
  };

  const resultMessage = () => {
    if (score >= questions.length * 0.8) {
      return currentLanguage === "ar"
        ? "ممتاز! أنت تتقن الموضوع."
        : currentLanguage === "en"
        ? "Excellent! You master the subject."
        : "Excellent ! Tu maîtrises le sujet.";
    } else if (score >= questions.length * 0.5) {
      return currentLanguage === "ar"
        ? "جيد! واصل المراجعة."
        : currentLanguage === "en"
        ? "Good! Keep revising."
        : "Bien ! Continue à réviser.";
    }
    return currentLanguage === "ar"
      ? "واصل جهودك، ستتقدم!"
      : currentLanguage === "en"
      ? "Keep up the effort, you'll improve!"
      : "Continue tes efforts, tu progresseras !";
  };

  const handleGenerate = async () => {
    if (topic.trim().length < 2) {
      Alert.alert(t("error"), "Saisis un sujet pour le quiz.");
      return;
    }

    const allowed = await checkAndConsume();
    if (!allowed) return;

    const { text: limitedTopic } = limitInput(topic, "quiz");

    const cacheInput = { topic: limitedTopic, count, language: currentLanguage };
    const cached = await readAICache("quiz", cacheInput);
    if (cached?.questions?.length > 0) {
      endTracking(true, true);
      setQuestions(cached.questions);
      setCurrentIndex(0);
      setScore(0);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setPhase("playing");
      return;
    }

    startTracking();
    setGenerating(true);
    try {
      const fn = httpsCallable(functions, "generateQuiz");
      const res = await fn({ topic: limitedTopic, count: parseInt(count), language: currentLanguage });
      const data = res.data as any;
      const qs: QuizQuestion[] = data.questions || [];
      if (qs.length === 0) throw new Error("Aucune question générée.");
      setQuestions(qs);
      setCurrentIndex(0);
      setScore(0);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setPhase("playing");
      await writeAICache("quiz", cacheInput, data);
      endTracking(true);
    } catch (e: any) {
      endTracking(false);
      Alert.alert(t("error"), e.message || "Génération échouée.");
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
      const finalScore = score + (selectedAnswer === questions[currentIndex].correct ? 0 : 0);
      setPhase("result");
      handleSaveResult(score); // ← AJOUT — sauvegarde automatique
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
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", marginBottom: 24,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}
          >
            <Ionicons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={24} color="#374151"
            />
          </TouchableOpacity>
          <View>
            <Text style={{
              fontSize: 22, fontWeight: "700", color: "#111827",
              textAlign: isRTL ? "right" : "left",
            }}>
              {t("quiz_screen_title")}
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
              {t("generated_by")}
            </Text>
          </View>
        </View>

        <UsageBanner isRTL={isRTL} />

        {/* Setup */}
        {phase === "setup" && (
          <View>
            <Text style={{
              fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 8,
              textAlign: isRTL ? "right" : "left",
            }}>
              🧠 {t("quiz_subject")}
            </Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder={t("quiz_subject") + "..."}
              placeholderTextColor="#9CA3AF"
              textAlign={isRTL ? "right" : "left"}
              style={{
                backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E7EB",
                borderRadius: 12, padding: 14, fontSize: 15, color: "#111827",
                marginBottom: 20, writingDirection: isRTL ? "rtl" : "ltr",
              }}
            />
            <Text style={{
              fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 10,
              textAlign: isRTL ? "right" : "left",
            }}>
              ❓ {t("quiz_questions")}
            </Text>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              gap: 10, marginBottom: 28,
            }}>
              {["3", "5", "10"].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setCount(n)}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
                    backgroundColor: count === n ? "#6366F1" : "#FFF",
                    borderWidth: 1, borderColor: count === n ? "#6366F1" : "#E5E7EB",
                  }}
                >
                  <Text style={{
                    fontWeight: "600", fontSize: 15,
                    color: count === n ? "#FFF" : "#374151",
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
                    {t("generating")}
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="sparkles" size={20} color="#FFF" />
                  <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>
                    {t("generate_quiz")}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* ── Historique quizzes ── ← AJOUT */}
            {cachedQuizzes.length > 0 && (
              <View style={{ marginTop: 28 }}>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={{
                    fontSize: 15, fontWeight: "700", color: "#111827",
                    textAlign: isRTL ? "right" : "left",
                  }}>
                    🕒 {currentLanguage === "ar" ? "الاختبارات السابقة"
                      : currentLanguage === "en" ? "Previous Quizzes"
                      : "Quiz précédents"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => confirmDeleteAll("quizzes", currentLanguage === "ar" ? "Quiz" : "Quiz", currentLanguage, () => setCachedQuizzes([]))}
                  >
                    <Text style={{ fontSize: 12, color: "#EF4444", fontWeight: "600" }}>
                      {currentLanguage === "ar" ? "حذف الكل" : currentLanguage === "en" ? "Clear all" : "Tout effacer"}
                    </Text>
                  </TouchableOpacity>
                </View>
                {cachedQuizzes.slice(0, displayCount).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleReplay(item)}
                    style={{
                      backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14,
                      marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB",
                      elevation: 1,
                    }}
                  >
                    <View style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      justifyContent: "space-between", alignItems: "center",
                    }}>
                      <Text style={{
                        fontSize: 13, fontWeight: "600", color: "#374151", flex: 1,
                        textAlign: isRTL ? "right" : "left",
                      }}
                        numberOfLines={1}
                      >
                        🧠 {item.topic}
                      </Text>
                      {/* Score badge */}
                      <View style={{
                        backgroundColor: item.score >= item.total * 0.8 ? "#F0FDF4"
                          : item.score >= item.total * 0.5 ? "#FFFBEB" : "#FEF2F2",
                        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
                        marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0,
                      }}>
                        <Text style={{
                          fontSize: 12, fontWeight: "700",
                          color: item.score >= item.total * 0.8 ? "#065F46"
                            : item.score >= item.total * 0.5 ? "#92400E" : "#991B1B",
                        }}>
                          {item.score}/{item.total}
                        </Text>
                      </View>
                    </View>
                    <View style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      justifyContent: "space-between", alignItems: "center", marginTop: 6,
                    }}>
                      <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
                        {new Date(item.createdAt).toLocaleDateString(
                          currentLanguage === "ar" ? "ar-SA"
                          : currentLanguage === "en" ? "en-GB" : "fr-FR"
                        )}
                      </Text>
                      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                        <TouchableOpacity
                          onPress={() => confirmDeleteOne(
                            "quizzes", item.id, item.topic, currentLanguage,
                            () => setCachedQuizzes((prev) => prev.filter((q) => q.id !== item.id)),
                            async () => {
                              const user = auth.currentUser;
                              if (!user) return;
                              const updated = cachedQuizzes.filter((q) => q.id !== item.id);
                              await AsyncStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({ data: updated, timestamp: Date.now() }));
                            }
                          )}
                        >
                          <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        </TouchableOpacity>
                        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="refresh-outline" size={12} color="#6366F1" />
                          <Text style={{ fontSize: 11, color: "#6366F1", fontWeight: "600" }}>
                            {currentLanguage === "ar" ? "إعادة"
                              : currentLanguage === "en" ? "Replay"
                              : "Rejouer"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}

                {hasMore && (
                  <TouchableOpacity
                    onPress={handleLoadMore}
                    disabled={loadingMore}
                    style={{
                      borderRadius: 12, padding: 14, alignItems: "center",
                      backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
                      marginTop: 4,
                    }}
                  >
                    {loadingMore ? (
                      <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="chevron-down" size={16} color="#6366F1" />
                        <Text style={{ fontWeight: "600", color: "#6366F1", fontSize: 14 }}>
                          {getMoreLabel()}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
            {/* ── fin Historique ── */}
          </View>
        )}

        {/* Playing */}
        {phase === "playing" && q && (
          <View>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              justifyContent: "space-between", marginBottom: 8,
            }}>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                {currentLanguage === "ar"
                  ? `سؤال ${currentIndex + 1}/${questions.length}`
                  : `Question ${currentIndex + 1}/${questions.length}`}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#6366F1" }}>
                {t("score")} : {score}
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
              <Text style={{
                fontSize: 16, fontWeight: "700", color: "#3730A3", lineHeight: 24,
                textAlign: isRTL ? "right" : "left",
                writingDirection: isRTL ? "rtl" : "ltr",
              }}>
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
                <TouchableOpacity
                  key={i}
                  onPress={() => handleAnswer(i)}
                  style={{
                    backgroundColor: bg, borderWidth: 1.5, borderColor: border,
                    borderRadius: 12, padding: 14, marginBottom: 10,
                    flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center",
                  }}
                >
                  <View style={{
                    width: 28, height: 28, borderRadius: 14, backgroundColor: border + "30",
                    alignItems: "center", justifyContent: "center",
                    marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
                  }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: border }}>
                      {String.fromCharCode(65 + i)}
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: 14, color: textColor, flex: 1,
                    textAlign: isRTL ? "right" : "left",
                    writingDirection: isRTL ? "rtl" : "ltr",
                  }}>
                    {option}
                  </Text>
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
                marginTop: 4, marginBottom: 16,
                borderLeftWidth: isRTL ? 0 : 4,
                borderRightWidth: isRTL ? 4 : 0,
                borderLeftColor: "#F59E0B",
                borderRightColor: "#F59E0B",
              }}>
                <Text style={{
                  fontSize: 13, color: "#92400E", lineHeight: 20,
                  textAlign: isRTL ? "right" : "left",
                  writingDirection: isRTL ? "rtl" : "ltr",
                }}>
                  💡 {q.explanation}
                </Text>
              </View>
            )}

            {showAnswer && (
              <TouchableOpacity
                onPress={handleNext}
                style={{
                  backgroundColor: "#6366F1", borderRadius: 14,
                  padding: 16, alignItems: "center",
                }}
              >
                <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
                  {currentIndex < questions.length - 1
                    ? t("next_question")
                    : t("see_results")}
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
                {score >= questions.length * 0.8 ? "🏆"
                  : score >= questions.length * 0.5 ? "👍" : "💪"}
              </Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
              {score}/{questions.length}
            </Text>
            <Text style={{
              fontSize: 15, color: "#6B7280", marginBottom: 12, textAlign: "center",
            }}>
              {resultMessage()}
            </Text>

            {/* Badge sauvegardé automatiquement ← AJOUT */}
            <View style={{
              backgroundColor: "#F0FDF4", borderRadius: 8, padding: 8,
              flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 24,
            }}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={{ fontSize: 12, color: "#065F46" }}>
                {currentLanguage === "ar" ? "تم حفظ النتيجة تلقائياً"
                  : currentLanguage === "en" ? "Result saved automatically"
                  : "Résultat sauvegardé automatiquement"}
              </Text>
            </View>

            {/* Boutons result ← AJOUT bouton Rejouer */}
            <View style={{ width: "100%", gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  // Rejouer le même quiz
                  setCurrentIndex(0);
                  setScore(0);
                  setSelectedAnswer(null);
                  setShowAnswer(false);
                  setPhase("playing");
                }}
                style={{
                  backgroundColor: "#EEF2FF", borderRadius: 14, padding: 16,
                  alignItems: "center", width: "100%",
                  flexDirection: "row", justifyContent: "center", gap: 8,
                }}
              >
                <Ionicons name="refresh-outline" size={18} color="#6366F1" />
                <Text style={{ color: "#6366F1", fontWeight: "700", fontSize: 16 }}>
                  {currentLanguage === "ar" ? "إعادة المحاولة"
                    : currentLanguage === "en" ? "Try again"
                    : "Réessayer"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReset}
                style={{
                  backgroundColor: "#6366F1", borderRadius: 14, padding: 16,
                  alignItems: "center", width: "100%",
                }}
              >
                <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
                  🔄 {t("new_quiz")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}