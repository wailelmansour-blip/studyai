import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";

export default function SignupScreen({ navigation }: any) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; firebase?: string }>({});
    const { signup, isLoading } = useAuthStore();

  const validate = () => {
        const e: typeof errors = {};
        if (name.trim().length < 2) e.name = "Nom trop court (2 caracteres min.)";
        if (!email.includes("@")) e.email = "Entre un email valide";
        if (password.length < 6) e.password = "Minimum 6 caracteres";
        setErrors(e);
        return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
        if (!validate()) return;
        setErrors({});
        try {
                await signup(name.trim(), email.trim().toLowerCase(), password);
        } catch (err: any) {
                setErrors({ firebase: err.message });
        }
  };

  return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                                    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}>
                                    
                                                <TouchableOpacity
                                                                onPress={() => navigation.goBack()}
                                                                style={{ width: 40, height: 40, backgroundColor: "#1e293b", borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 32 }}
                                                              >
                                                              <Ionicons name="arrow-back" size={20} color="#94a3b8" />
                                                </TouchableOpacity>TouchableOpacity>
                                    
                                                <Text style={{ color: "white", fontSize: 28, fontWeight: "bold", marginBottom: 4 }}>Creer un compte</Text>Text>
                                                <Text style={{ color: "#94a3b8", fontSize: 14, marginBottom: 32 }}>Rejoins des milliers d'etudiants qui utilisent l'IA</Text>Text>
                                    
                                                <View style={{ flexDirection: "row", gap: 12, marginBottom: 32 }}>
                                                  {[{ label: "Etudiants", value: "50K+" }, { label: "Matieres", value: "200+" }, { label: "Quiz", value: "1M+" }].map((s) => (
                          <View key={s.label} style={{ flex: 1, backgroundColor: "#1e293b", borderRadius: 16, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(51,65,85,0.5)" }}>
                                            <Text style={{ color: "#818cf8", fontWeight: "bold", fontSize: 18 }}>{s.value}</Text>Text>
                                            <Text style={{ color: "#64748b", fontSize: 11 }}>{s.label}</Text>Text>
                          </View>View>
                        ))}
                                                </View>View>
                                    
                                      {errors.firebase && (
                        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 }}>
                                        <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                                        <Text style={{ color: "#f87171", fontSize: 14, flex: 1, marginLeft: 8 }}>{errors.firebase}</Text>Text>
                        </View>View>
                                                )}
                                    
                                                <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "600", marginBottom: 8 }}>Nom complet</Text>Text>
                                                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#1e293b", borderRadius: 16, borderWidth: 1, borderColor: "#334155", paddingHorizontal: 16, paddingVertical: 14, marginBottom: 4 }}>
                                                              <Ionicons name="person-outline" size={20} color="#64748b" style={{ marginRight: 12 }} />
                                                              <Text style={{ flex: 1, color: name ? "white" : "#475569", fontSize: 16 }}>{name || "John Doe"}</Text>Text>
                                                </View>View>
                                      {errors.name && <Text style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>{errors.name}</Text>Text>}
                                    
                                                <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "600", marginTop: 12, marginBottom: 8 }}>Email</Text>Text>
                                                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#1e293b", borderRadius: 16, borderWidth: 1, borderColor: "#334155", paddingHorizontal: 16, paddingVertical: 14, marginBottom: 4 }}>
                                                              <Ionicons name="mail-outline" size={20} color="#64748b" style={{ marginRight: 12 }} />
                                                              <Text style={{ flex: 1, color: email ? "white" : "#475569", fontSize: 16 }}>{email || "you@example.com"}</Text>Text>
                                                </View>View>
                                      {errors.email && <Text style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>{errors.email}</Text>Text>}
                                    
                                                <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "600", marginTop: 12, marginBottom: 8 }}>Mot de passe</Text>Text>
                                                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#1e293b", borderRadius: 16, borderWidth: 1, borderColor: "#334155", paddingHorizontal: 16, paddingVertical: 14, marginBottom: 4 }}>
                                                              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={{ marginRight: 12 }} />
                                                              <Text style={{ flex: 1, color: "#475569", fontSize: 16 }}>Min. 6 caracteres</Text>Text>
                                                </View>View>
                                      {errors.password && <Text style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>{errors.password}</Text>Text>}
                                    
                                                <Text style={{ color: "#64748b", fontSize: 12, marginTop: 8, marginBottom: 24 }}>
                                                              En vous inscrivant, vous acceptez nos Conditions d'utilisation.
                                                </Text>Text>
                                    
                                                <TouchableOpacity
                                                                onPress={handleSignup}
                                                                disabled={isLoading}
                                                                style={{ backgroundColor: isLoading ? "#4338ca" : "#6366f1", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 16, opacity: isLoading ? 0.7 : 1 }}
                                                              >
                                                              <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                                                                {isLoading ? "Creation..." : "Creer mon compte"}
                                                              </Text>Text>
                                                </TouchableOpacity>TouchableOpacity>
                                    
                                                <View style={{ flexDirection: "row", justifyContent: "center" }}>
                                                              <Text style={{ color: "#94a3b8", fontSize: 14 }}>Deja un compte ? </Text>Text>
                                                              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                                                                              <Text style={{ color: "#818cf8", fontSize: 14, fontWeight: "600" }}>Se connecter</Text>Text>
                                                              </TouchableOpacity>TouchableOpacity>
                                                </View>View>
                                    
                                    </View>View>
                          </ScrollView>ScrollView>
                </KeyboardAvoidingView>KeyboardAvoidingView>
        </SafeAreaView>SafeAreaView>
      );
}</ScrollView>
