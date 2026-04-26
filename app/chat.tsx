// app/chat.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { useChatStore } from "../store/chatStore";
import { ChatMessage } from "../types/chat";

const COURSES = [
  "Mathématiques", "Physique", "Chimie",
  "Histoire", "Géographie", "Biologie",
  "Informatique", "Littérature", "Philosophie", "Anglais",
];

export default function ChatScreen() {
  const app = getApp();
  const auth = getAuth(app);
  const functions = getFunctions(app, "us-central1");
  const { currentSession, createSession, addMessage } = useChatStore();

  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  const handleSelectCourse = async (course: string) => {
    setSelectedCourse(course);
    setMessages([{
      id: Date.now().toString(),
      role: "assistant",
      content: `Bonjour ! Je suis ton assistant pour le cours de **${course}**. Pose-moi toutes tes questions sur ce sujet et je ferai de mon mieux pour t'aider. 📚`,
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

  const handleSend = async () => {
    if (!message.trim() || !selectedCourse || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message.trim(),
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setMessage("");
    setIsTyping(true);

    try {
      const fn = httpsCallable(functions, "chatAI");
      const res = await fn({
        message: userMessage.content,
        courseName: selectedCourse,
        history: messages.slice(-8).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const data = res.data as any;
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.rejected
          ? data.reason || "Je ne peux pas répondre à cette question."
          : data.answer || "Je n'ai pas pu générer une réponse.",
        timestamp: new Date().toISOString(),
        isRejected: data.rejected,
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);

      // Sauvegarder dans Firestore
      if (sessionId) {
        await addMessage(sessionId, userMessage);
        await addMessage(sessionId, assistantMessage);
      }
    } catch (e: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Une erreur s'est produite. Réessaie.",
        timestamp: new Date().toISOString(),
      };
      setMessages([...newMessages, errorMessage]);
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

  // ── Sélection du cours ──
  if (!selectedCourse) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827" }}>
                Chat IA
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                Sélectionne un cours pour commencer
              </Text>
            </View>
          </View>

          <View style={{
            backgroundColor: "#EEF2FF", borderRadius: 14,
            padding: 16, marginBottom: 24,
          }}>
            <Text style={{ fontSize: 14, color: "#3730A3", lineHeight: 20 }}>
              🔒 Ce chat est limité au cours sélectionné. Les questions hors-sujet seront rejetées pour rester focalisé sur ton apprentissage.
            </Text>
          </View>

          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 14 }}>
            📚 Choisir un cours
          </Text>
          {COURSES.map((course) => (
            <TouchableOpacity
              key={course}
              onPress={() => handleSelectCourse(course)}
              style={{
                backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16,
                flexDirection: "row", alignItems: "center",
                borderWidth: 1, borderColor: "#F3F4F6",
                marginBottom: 10, elevation: 1,
              }}
            >
              <View style={{
                width: 40, height: 40, borderRadius: 10,
                backgroundColor: "#EEF2FF", alignItems: "center",
                justifyContent: "center", marginRight: 14,
              }}>
                <Ionicons name="book-outline" size={20} color="#6366F1" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827", flex: 1 }}>
                {course}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Header */}
        <View style={{
          backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 12,
          flexDirection: "row", alignItems: "center",
          borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
          elevation: 2,
        }}>
          <TouchableOpacity onPress={handleReset} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: "#EEF2FF", alignItems: "center",
            justifyContent: "center", marginRight: 10,
          }}>
            <Ionicons name="school" size={18} color="#6366F1" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
              {selectedCourse}
            </Text>
            <Text style={{ fontSize: 12, color: "#10B981" }}>
              Chat IA · Questions limitées au cours
            </Text>
          </View>
          <TouchableOpacity onPress={handleReset} style={{ padding: 4 }}>
            <Ionicons name="refresh-outline" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={{
                marginBottom: 12,
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {msg.role === "assistant" && (
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: msg.isRejected ? "#FEF2F2" : "#EEF2FF",
                  alignItems: "center", justifyContent: "center",
                  marginBottom: 4,
                }}>
                  <Ionicons
                    name={msg.isRejected ? "close-circle" : "school"}
                    size={14}
                    color={msg.isRejected ? "#EF4444" : "#6366F1"}
                  />
                </View>
              )}
              <View style={{
                maxWidth: "80%",
                backgroundColor: msg.role === "user"
                  ? "#6366F1"
                  : msg.isRejected ? "#FEF2F2" : "#FFFFFF",
                borderRadius: 16,
                borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                borderBottomLeftRadius: msg.role === "assistant" ? 4 : 16,
                padding: 12,
                elevation: 1,
                borderWidth: msg.isRejected ? 1 : 0,
                borderColor: msg.isRejected ? "#FECACA" : "transparent",
              }}>
                <Text style={{
                  fontSize: 14, lineHeight: 20,
                  color: msg.role === "user"
                    ? "#FFFFFF"
                    : msg.isRejected ? "#EF4444" : "#111827",
                }}>
                  {msg.content}
                </Text>
              </View>
              <Text style={{
                fontSize: 10, color: "#9CA3AF", marginTop: 4,
                marginHorizontal: 4,
              }}>
                {new Date(msg.timestamp).toLocaleTimeString("fr-FR", {
                  hour: "2-digit", minute: "2-digit",
                })}
              </Text>
            </View>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <View style={{ alignItems: "flex-start", marginBottom: 12 }}>
              <View style={{
                backgroundColor: "#FFFFFF", borderRadius: 16,
                borderBottomLeftRadius: 4, padding: 14, elevation: 1,
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
          flexDirection: "row", alignItems: "flex-end",
          borderTopWidth: 1, borderTopColor: "#F3F4F6",
        }}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={`Question sur ${selectedCourse}...`}
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            style={{
              flex: 1, backgroundColor: "#F8F9FA", borderRadius: 20,
              paddingHorizontal: 16, paddingVertical: 10,
              fontSize: 14, color: "#111827", maxHeight: 100,
              borderWidth: 1, borderColor: "#E5E7EB",
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!message.trim() || isTyping}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: message.trim() && !isTyping ? "#6366F1" : "#E5E7EB",
              alignItems: "center", justifyContent: "center",
              marginLeft: 8,
            }}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name="send"
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