// app/chat.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  getFirestore, collection, getDocs, query, where,
  orderBy, limit, deleteDoc, doc,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useChatStore } from "../store/chatStore";
import { ChatMessage } from "../types/chat";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../store/languageStore";
import { useAIRequest } from "../hooks/useAIRequest";
import { UsageBanner } from "../components/UsageBanner";
import { limitInput } from "../utils/inputLimiter";
import { useAnalytics } from "../hooks/useAnalytics"; // ← AJOUT Phase 17
import { useDeleteHistory } from "../hooks/useDeleteHistory";
import { useHistoryStore } from "../store/historyStore";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

const CACHE_KEY = "studyai_chatSessions";
const PAGE_SIZE = 5;

const COURSES_FR = [
  "Mathématiques", "Physique", "Chimie",
  "Histoire", "Géographie", "Biologie",
  "Informatique", "Littérature", "Philosophie", "Anglais",
];

const COURSES_EN = [
  "Mathematics", "Physics", "Chemistry",
  "History", "Geography", "Biology",
  "Computer Science", "Literature", "Philosophy", "English",
];

const COURSES_AR = [
  "الرياضيات", "الفيزياء", "الكيمياء",
  "التاريخ", "الجغرافيا", "الأحياء",
  "الإعلام الآلي", "الأدب", "الفلسفة", "الإنجليزية",
];

interface CachedChatSession {
  id: string;
  userId: string;
  courseName: string;
  messages: { role: string; content: string }[];
  createdAt: string;
  updatedAt: string;
}

function MessageText({
  content, color, isRTL,
}: { content: string; color: string; isRTL: boolean }) {
  const lines = content.split("\n").filter((l) => l.trim() !== "");
  return (
    <View>
      {lines.map((line, i) => {
        const isBold = line.startsWith("**") || /^\d+[\.\)]/.test(line);
        const cleaned = line.replace(/\*\*/g, "").trim();
        return (
          <Text
            key={i}
            style={{
              fontSize: 14, lineHeight: 22, color,
              fontWeight: isBold ? "700" : "400",
              marginTop: i > 0 ? 4 : 0,
              textAlign: isRTL ? "right" : "left",
              writingDirection: isRTL ? "rtl" : "ltr",
            }}
          >
            {cleaned}
          </Text>
        );
      })}
    </View>
  );
}

export default function ChatScreen() {
  const app = getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, "us-central1");
  const { createSession, addMessage } = useChatStore();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const isRTL = currentLanguage === "ar";
  const { checkAndConsume } = useAIRequest();
  const { confirmDeleteOne, confirmDeleteAll } = useDeleteHistory();
  const refreshTrigger = useHistoryStore((state) => state.refreshTrigger["chatSessions"] || 0);
  const { startTracking, endTracking, trackView } = useAnalytics("chat"); // ← AJOUT Phase 17

  const COURSES =
    currentLanguage === "ar" ? COURSES_AR
    : currentLanguage === "en" ? COURSES_EN
    : COURSES_FR;

  
  

  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // ── Historique sessions ──
  const [cachedSessions, setCachedSessions] = useState<CachedChatSession[]>([]);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Remplacer tout le useEffect par ces deux blocs :
useEffect(() => {
  trackView();
}, []);

useFocusEffect(
  useCallback(() => {
    const loadCache = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const raw = await AsyncStorage.getItem(`${CACHE_KEY}_${user.uid}`);
        if (raw) {
          const { data } = JSON.parse(raw);
          if (data?.length > 0) {
            setCachedSessions(data);
            setHasMore(data.length >= PAGE_SIZE);
          }
        }

        const q = query(
          collection(db, "chatSessions"),
          where("userId", "==", user.uid),
          orderBy("updatedAt", "desc"),
          limit(PAGE_SIZE)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          setCachedSessions([]);
          return;
        }

        const fromFirestore: CachedChatSession[] = snap.docs.map((d) => ({
          id: d.id,
          userId: d.data().userId,
          courseName: d.data().courseName || "",
          messages: d.data().messages || [],
          createdAt: d.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        }));

        setCachedSessions(fromFirestore);
        setHasMore(snap.docs.length === PAGE_SIZE);
        await AsyncStorage.setItem(
          `${CACHE_KEY}_${user.uid}`,
          JSON.stringify({ data: fromFirestore, timestamp: Date.now() })
        );
      } catch (e) {
        console.log("Chat history load error:", e);
      }
    };
    loadCache();
  }, [refreshTrigger])
);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

  const getWelcomeMessage = (course: string) => {
    if (currentLanguage === "ar") {
      return `مرحباً! أنا مساعدك لمادة ${course}.\nاطرح عليّ أي سؤال حول هذه المادة وسأبذل قصارى جهدي لمساعدتك. 📚`;
    } else if (currentLanguage === "en") {
      return `Hello! I'm your assistant for ${course}.\nAsk me any question about this subject and I'll do my best to help you. 📚`;
    }
    return `Bonjour ! Je suis ton assistant pour le cours de ${course}.\nPose-moi toutes tes questions sur ce sujet et je ferai de mon mieux pour t'aider. 📚`;
  };

  const getErrorMessage = () => {
    if (currentLanguage === "ar") return "حدث خطأ. حاول مجدداً.";
    if (currentLanguage === "en") return "An error occurred. Please try again.";
    return "Une erreur s'est produite. Réessaie.";
  };

  const getDefaultRejection = () => {
    if (currentLanguage === "ar") return "لا يمكنني الإجابة على هذا السؤال خارج الموضوع.";
    if (currentLanguage === "en") return "I cannot answer this off-topic question.";
    return "Je ne peux pas répondre à cette question hors-sujet.";
  };

  const getNoAnswerMessage = () => {
    if (currentLanguage === "ar") return "لم أتمكن من إنشاء إجابة.";
    if (currentLanguage === "en") return "I couldn't generate an answer.";
    return "Je n'ai pas pu générer une réponse.";
  };

  const handleLoadMoreSessions = async () => {
    const user = auth.currentUser;
    if (!user || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "chatSessions"),
        where("userId", "==", user.uid),
        orderBy("updatedAt", "desc"),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const more: CachedChatSession[] = snap.docs
        .filter((d) => !cachedSessions.find((s) => s.id === d.id))
        .map((d) => ({
          id: d.id,
          userId: d.data().userId,
          courseName: d.data().courseName || "",
          messages: d.data().messages || [],
          createdAt: d.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        }));
      const updated = [...cachedSessions, ...more];
      setCachedSessions(updated);
      setHasMore(more.length === PAGE_SIZE);
    } catch (e) {
      console.log("Load more sessions error:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleResumeSession = (session: CachedChatSession) => {
    setSelectedCourse(session.courseName);
    setSessionId(session.id);
    setMessages(
      session.messages.map((m, i) => ({
        id: i.toString(),
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: session.updatedAt,
      }))
    );
  };

  const handleSelectCourse = async (course: string) => {
    setSelectedCourse(course);
    setMessages([{
      id: Date.now().toString(),
      role: "assistant",
      content: getWelcomeMessage(course),
      timestamp: new Date().toISOString(),
    }]);
    try {
      const user = auth.currentUser;
      if (user) {
        const id = await createSession(user.uid, course.toLowerCase(), course);
        setSessionId(id);
      }
    } catch (e) {
      console.log("Session creation error:", e);
    }
  };

  const updateSessionCache = async (sid: string, finalMessages: ChatMessage[]) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const updatedSessions = cachedSessions.map((s) =>
        s.id === sid ? { ...s, messages: finalMessages, updatedAt: new Date().toISOString() } : s
      );
      if (!updatedSessions.find((s) => s.id === sid)) {
        updatedSessions.unshift({
          id: sid,
          userId: user.uid,
          courseName: selectedCourse || "",
          messages: finalMessages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      setCachedSessions(updatedSessions.slice(0, 10));
      await AsyncStorage.setItem(
        `${CACHE_KEY}_${user.uid}`,
        JSON.stringify({ data: updatedSessions.slice(0, 10), timestamp: Date.now() })
      );
    } catch (e) {
      console.log("updateSessionCache error:", e);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedCourse || isTyping) return;

    const allowed = await checkAndConsume();
    if (!allowed) return;

    const { text: limitedMessage } = limitInput(message.trim(), "chat");

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: limitedMessage,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setMessage("");
    setIsTyping(true);

    startTracking(); // ← AJOUT Phase 17
    try {
      const fn = httpsCallable(functions, "chatAI");
      const res = await fn({
        message: userMessage.content,
        courseName: selectedCourse,
        language: currentLanguage,
        history: messages.slice(-8).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const data = res.data as any;

      let answerContent = data.rejected
        ? data.reason || getDefaultRejection()
        : data.answer || getNoAnswerMessage();

      answerContent = answerContent
        .replace(/```json[\s\S]*?```/g, "")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/\{\s*"answer"\s*:[\s\S]*?\}/g, "")
        .replace(/\{\s*"rejected"\s*:[\s\S]*?\}/g, "")
        .trim();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: answerContent,
        timestamp: new Date().toISOString(),
        isRejected: data.rejected,
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      endTracking(true); // ← AJOUT Phase 17 — succès

      if (sessionId) {
        await addMessage(sessionId, userMessage);
        await addMessage(sessionId, assistantMessage);
        await updateSessionCache(sessionId, finalMessages);
      }
    } catch (e: any) {
      endTracking(false); // ← AJOUT Phase 17 — échec
      setMessages([...newMessages, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getErrorMessage(),
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleReset = () => {
    setSelectedCourse(null);
    setMessages([]);
    setSessionId(null);
    setMessage("");
  };

  const timeLocale =
    currentLanguage === "ar" ? "ar-SA"
    : currentLanguage === "en" ? "en-GB"
    : "fr-FR";

  // ── Sélection du cours ──
  if (!selectedCourse) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

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
                {t("chat_screen_title")}
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                {t("select_course")}
              </Text>
            </View>
          </View>

          <UsageBanner isRTL={isRTL} />

          {/* Info */}
          <View style={{
            backgroundColor: "#EEF2FF", borderRadius: 14,
            padding: 16, marginBottom: 24,
            borderLeftWidth: isRTL ? 0 : 4,
            borderRightWidth: isRTL ? 4 : 0,
            borderLeftColor: "#6366F1",
            borderRightColor: "#6366F1",
          }}>
            <Text style={{
              fontSize: 14, color: "#3730A3", lineHeight: 22,
              textAlign: isRTL ? "right" : "left",
            }}>
              🔒 {t("chat_locked")}
            </Text>
          </View>

          {/* Liste des cours */}
          {/* ── Historique sessions chat ── */}
          {cachedSessions.length > 0 && (
            <View style={{ marginBottom: 28 }}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827", textAlign: isRTL ? "right" : "left" }}>
                  🕒 {currentLanguage === "ar" ? "المحادثات السابقة"
                    : currentLanguage === "en" ? "Previous Chats"
                    : "Conversations récentes"}
                </Text>
                <TouchableOpacity
                  onPress={() => confirmDeleteAll("chatSessions", "Chat", currentLanguage, () => setCachedSessions([]))}
                >
                  <Text style={{ fontSize: 12, color: "#EF4444", fontWeight: "600" }}>
                    {currentLanguage === "ar" ? "حذف الكل" : currentLanguage === "en" ? "Clear all" : "Tout effacer"}
                  </Text>
                </TouchableOpacity>
              </View>
              {cachedSessions.slice(0, displayCount).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleResumeSession(item)}
                  style={{
                    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14,
                    marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB",
                    elevation: 1,
                  }}
                >
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", flex: 1, gap: 8 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="school" size={16} color="#6366F1" />
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", flex: 1, textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>
                        {item.courseName}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => confirmDeleteOne(
                        "chatSessions", item.id, item.courseName, currentLanguage,
                        () => setCachedSessions((prev) => prev.filter((s) => s.id !== item.id)),
                        async () => {
                          const user = auth.currentUser;
                          if (!user) return;
                          const updated = cachedSessions.filter((s) => s.id !== item.id);
                          await AsyncStorage.setItem(`${CACHE_KEY}_${user.uid}`, JSON.stringify({ data: updated, timestamp: Date.now() }));
                        }
                      )}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                    <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
                      {new Date(item.updatedAt).toLocaleDateString(
                        currentLanguage === "ar" ? "ar-SA" : currentLanguage === "en" ? "en-GB" : "fr-FR"
                      )}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <View style={{ backgroundColor: "#EEF2FF", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 11, color: "#6366F1", fontWeight: "600" }}>
                          {item.messages.length} {currentLanguage === "ar" ? "رسالة" : currentLanguage === "en" ? "msgs" : "msgs"}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={12} color="#9CA3AF" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              {hasMore && (
                <TouchableOpacity
                  onPress={handleLoadMoreSessions}
                  disabled={loadingMore}
                  style={{ borderRadius: 12, padding: 14, alignItems: "center", backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB", marginTop: 4 }}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color="#6366F1" />
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="chevron-down" size={16} color="#6366F1" />
                      <Text style={{ fontWeight: "600", color: "#6366F1", fontSize: 14 }}>
                        {currentLanguage === "ar" ? "عرض المزيد" : currentLanguage === "en" ? "Load more" : "Voir plus"}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
          {/* ── fin Historique ── */}

          <Text style={{
            fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 14,
            textAlign: isRTL ? "right" : "left",
          }}>
            📚 {t("choose_course")}
          </Text>
          {COURSES.map((course) => (
            <TouchableOpacity
              key={course}
              onPress={() => handleSelectCourse(course)}
              style={{
                backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16,
                flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center",
                borderWidth: 1, borderColor: "#F3F4F6",
                marginBottom: 10, elevation: 1,
              }}
            >
              <View style={{
                width: 40, height: 40, borderRadius: 10,
                backgroundColor: "#EEF2FF", alignItems: "center",
                justifyContent: "center",
                marginRight: isRTL ? 0 : 14,
                marginLeft: isRTL ? 14 : 0,
              }}>
                <Ionicons name="book-outline" size={20} color="#6366F1" />
              </View>
              <Text style={{
                fontSize: 15, fontWeight: "600", color: "#111827", flex: 1,
                textAlign: isRTL ? "right" : "left",
              }}>
                {course}
              </Text>
              <Ionicons
                name={isRTL ? "chevron-back" : "chevron-forward"}
                size={18} color="#9CA3AF"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Interface Chat ──
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 80}
      >
        {/* Header */}
        <View style={{
          backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 12,
          flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center",
          borderBottomWidth: 1, borderBottomColor: "#F3F4F6", elevation: 2,
        }}>
          <TouchableOpacity
            onPress={handleReset}
            style={{ marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}
          >
            <Ionicons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={24} color="#374151"
            />
          </TouchableOpacity>
          <View style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: "#EEF2FF", alignItems: "center",
            justifyContent: "center",
            marginRight: isRTL ? 0 : 10,
            marginLeft: isRTL ? 10 : 0,
          }}>
            <Ionicons name="school" size={18} color="#6366F1" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 15, fontWeight: "700", color: "#111827",
              textAlign: isRTL ? "right" : "left",
            }}>
              {selectedCourse}
            </Text>
            <Text style={{
              fontSize: 12, color: "#10B981",
              textAlign: isRTL ? "right" : "left",
            }}>
              {t("chat_limited")}
            </Text>
          </View>
          <TouchableOpacity onPress={handleReset} style={{ padding: 4 }}>
            <Ionicons name="refresh-outline" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={{
                marginBottom: 14,
                alignItems: msg.role === "user"
                  ? (isRTL ? "flex-start" : "flex-end")
                  : (isRTL ? "flex-end" : "flex-start"),
              }}
            >
              {msg.role === "assistant" && (
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: msg.isRejected ? "#FEF2F2" : "#EEF2FF",
                  alignItems: "center", justifyContent: "center", marginBottom: 4,
                }}>
                  <Ionicons
                    name={msg.isRejected ? "close-circle" : "school"}
                    size={14}
                    color={msg.isRejected ? "#EF4444" : "#6366F1"}
                  />
                </View>
              )}

              <View style={{
                maxWidth: "82%",
                backgroundColor: msg.role === "user"
                  ? "#6366F1"
                  : msg.isRejected ? "#FEF2F2" : "#FFFFFF",
                borderRadius: 16,
                borderBottomRightRadius: msg.role === "user" && !isRTL ? 4
                  : msg.role === "assistant" && isRTL ? 4 : 16,
                borderBottomLeftRadius: msg.role === "assistant" && !isRTL ? 4
                  : msg.role === "user" && isRTL ? 4 : 16,
                padding: 12, elevation: 1,
                borderWidth: msg.isRejected ? 1 : 0,
                borderColor: msg.isRejected ? "#FECACA" : "transparent",
              }}>
                {msg.role === "user" ? (
                  <Text style={{
                    fontSize: 14, lineHeight: 22, color: "#FFFFFF",
                    textAlign: isRTL ? "right" : "left",
                    writingDirection: isRTL ? "rtl" : "ltr",
                  }}>
                    {msg.content}
                  </Text>
                ) : (
                  <MessageText
                    content={msg.content}
                    color={msg.isRejected ? "#EF4444" : "#111827"}
                    isRTL={isRTL}
                  />
                )}
              </View>

              <Text style={{
                fontSize: 10, color: "#9CA3AF",
                marginTop: 4, marginHorizontal: 4,
              }}>
                {new Date(msg.timestamp).toLocaleTimeString(timeLocale, {
                  hour: "2-digit", minute: "2-digit",
                })}
              </Text>
            </View>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <View style={{
              alignItems: isRTL ? "flex-end" : "flex-start",
              marginBottom: 12,
            }}>
              <View style={{
                backgroundColor: "#FFFFFF", borderRadius: 16,
                borderBottomLeftRadius: isRTL ? 16 : 4,
                borderBottomRightRadius: isRTL ? 4 : 16,
                padding: 14, elevation: 1,
              }}>
                <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={{
                      width: 6, height: 6, borderRadius: 3,
                      backgroundColor: "#6366F1", opacity: 0.6,
                    }} />
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={{
          backgroundColor: "#FFFFFF", padding: 12,
          flexDirection: isRTL ? "row-reverse" : "row", alignItems: "flex-end",
          borderTopWidth: 1, borderTopColor: "#F3F4F6",
        }}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={`${t("chat_placeholder")} ${selectedCourse}...`}
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
            textAlign={isRTL ? "right" : "left"}
            style={{
              flex: 1, backgroundColor: "#F8F9FA", borderRadius: 20,
              paddingHorizontal: 16, paddingVertical: 10,
              fontSize: 14, color: "#111827", maxHeight: 100,
              borderWidth: 1, borderColor: "#E5E7EB",
              writingDirection: isRTL ? "rtl" : "ltr",
              marginLeft: isRTL ? 8 : 0,
              marginRight: isRTL ? 0 : 8,
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!message.trim() || isTyping}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: message.trim() && !isTyping ? "#6366F1" : "#E5E7EB",
              alignItems: "center", justifyContent: "center",
            }}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name={isRTL ? "send" : "send"}
                size={18}
                color={message.trim() ? "#FFFFFF" : "#9CA3AF"}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}