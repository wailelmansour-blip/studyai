import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { callSummarize } from "../../services/functionsService";
import { createSummary, getSummaries, Summary } from "../../services/summariesService";

export default function SummaryScreen() {
  const { user } = useAuthStore();

  // ── State ──────────────────────────────────────────────────────
  const [inputText, setInputText]     = useState("");
  const [summary, setSummary]         = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [isSaved, setIsSaved]         = useState(false);
  const [error, setError]             = useState("");
  const [history, setHistory]         = useState<Summary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // ── Load history on mount ──────────────────────────────────────
  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const data = await getSummaries(user.id);
      setHistory(data);
    } catch (err) {
      console.error("Failed to load summaries:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // ── Generate Summary ───────────────────────────────────────────
  const handleGenerateSummary = async () => {
    if (!user) return;

    // Validation
    if (!inputText.trim()) {
      setError("Veuillez entrer un texte à résumer.");
      return;
    }
    if (inputText.trim().length < 50) {
      setError("Le texte est trop court (minimum 50 caractères).");
      return;
    }

    setError("");
    setIsLoading(true);
    setSummary("");
    setIsSaved(false);

    try {
      const result = await callSummarize(inputText.trim());
      setSummary(result);
    } catch (err: any) {
      const msg = err?.message ?? "Une erreur est survenue.";
      setError(msg);
      Alert.alert("Erreur", msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Save to Firestore ──────────────────────────────────────────
  const handleSave = async () => {
    if (!user || !summary) return;
    setIsSaving(true);
    try {
      await createSummary(user.id, inputText.trim(), summary);
      setIsSaved(true);
      await loadHistory(); // refresh history
      Alert.alert("Sauvegardé !", "Le résumé a été enregistré.");
    } catch (err: any) {
      Alert.alert("Erreur", err?.message ?? "Impossible de sauvegarder.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────
  const handleReset = () => {
    setInputText("");
    setSummary("");
    setError("");
    setIsSaved(false);
  };

  // ── Load a summary from history ────────────────────────────────
  const handleLoadFromHistory = (item: Summary) => {
    setInputText(item.originalText);
    setSummary(item.summary);
    setIsSaved(true);
    setShowHistory(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>

          {/* ── Header ── */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <View>
              <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
                Résumé IA
              </Text>
              <Text style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>
                Colle un texte et laisse l'IA le résumer
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowHistory(!showHistory)}
              style={{ backgroundColor: "#1e293b", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#334155" }}
            >
              <Ionicons name="time-outline" size={20} color="#6366f1" />
            </TouchableOpacity>
          </View>

          {/* ── Historique ── */}
          {showHistory && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: "white", fontWeight: "700", fontSize: 16, marginBottom: 12 }}>
                Historique
              </Text>
              {isLoadingHistory ? (
                <ActivityIndicator color="#6366f1" />
              ) : history.length === 0 ? (
                <Text style={{ color: "#475569", fontSize: 13 }}>Aucun résumé sauvegardé.</Text>
              ) : (
                history.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleLoadFromHistory(item)}
                    style={{
                      backgroundColor: "#1e293b", borderRadius: 14,
                      padding: 14, marginBottom: 10,
                      borderWidth: 1, borderColor: "#334155",
                    }}
                  >
                    <Text style={{ color: "white", fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                      {item.originalText.substring(0, 60)}...
                    </Text>
                    <Text style={{ color: "#64748b", fontSize: 11, marginTop: 4 }} numberOfLines={2}>
                      {item.summary.substring(0, 100)}...
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* ── Zone de texte input ── */}
          <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
            Texte à résumer
          </Text>
          <View style={{
            backgroundColor: "#1e293b", borderRadius: 16,
            borderWidth: 1, borderColor: error ? "#ef4444" : "#334155",
            padding: 16, marginBottom: 8, minHeight: 160,
          }}>
            <TextInput
              multiline
              placeholder="Colle ici ton cours, article ou document..."
              placeholderTextColor="#475569"
              value={inputText}
              onChangeText={(t) => { setInputText(t); setError(""); }}
              style={{ color: "white", fontSize: 14, lineHeight: 22 }}
            />
          </View>

          {/* Compteur de caractères */}
          <Text style={{ color: "#475569", fontSize: 11, textAlign: "right", marginBottom: 16 }}>
            {inputText.length} / 50 000 caractères
          </Text>

          {/* ── Erreur ── */}
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

          {/* ── Bouton Generate Summary ── */}
          <TouchableOpacity
            onPress={handleGenerateSummary}
            disabled={isLoading || !inputText.trim()}
            style={{
              backgroundColor: isLoading || !inputText.trim() ? "#1e293b" : "#6366f1",
              borderRadius: 16, paddingVertical: 16,
              alignItems: "center", marginBottom: 12,
              flexDirection: "row", justifyContent: "center", gap: 8,
              opacity: isLoading ? 0.7 : 1,
              borderWidth: 1,
              borderColor: isLoading || !inputText.trim() ? "#334155" : "#6366f1",
            }}
          >
            {isLoading ? (
              <>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={{ color: "#6366f1", fontWeight: "700", fontSize: 15 }}>
                  L'IA résume...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={inputText.trim() ? "white" : "#475569"} />
                <Text style={{ color: inputText.trim() ? "white" : "#475569", fontWeight: "700", fontSize: 15 }}>
                  Générer un résumé
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* ── Résultat ── */}
          {summary !== "" && (
            <View style={{ marginTop: 8 }}>

              {/* Header résultat */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="sparkles" size={18} color="#6366f1" />
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                    Résumé généré
                  </Text>
                </View>
                <TouchableOpacity onPress={handleReset}>
                  <Ionicons name="refresh-outline" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Contenu du résumé */}
              <View style={{
                backgroundColor: "#1e293b", borderRadius: 16,
                padding: 16, marginBottom: 16,
                borderWidth: 1, borderColor: "rgba(99,102,241,0.3)",
              }}>
                <Text style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 24 }}>
                  {summary}
                </Text>
              </View>

              {/* Bouton Save */}
              {!isSaved ? (
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={isSaving}
                  style={{
                    backgroundColor: "#10b981", borderRadius: 16,
                    paddingVertical: 14, alignItems: "center",
                    flexDirection: "row", justifyContent: "center", gap: 8,
                    opacity: isSaving ? 0.7 : 1,
                  }}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="save-outline" size={18} color="white" />
                  )}
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                    {isSaving ? "Sauvegarde..." : "Sauvegarder dans Firestore"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                  backgroundColor: "rgba(16,185,129,0.1)",
                  borderWidth: 1, borderColor: "rgba(16,185,129,0.3)",
                  borderRadius: 16, paddingVertical: 14,
                }}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#10b981" />
                  <Text style={{ color: "#34d399", fontWeight: "700", fontSize: 15 }}>
                    Résumé sauvegardé !
                  </Text>
                </View>
              )}
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}