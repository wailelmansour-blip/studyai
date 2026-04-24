import React, { useState } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { createNote } from "../../services/notesService";
import { FileUploader } from "../../components/FileUploader";
import { FileList } from "../../components/FileList";

// ─── NoteScreen ───────────────────────────────────────────────────────────────
// This screen lets the user:
// 1. Write a note and save it to Firestore
// 2. Upload PDF/images linked to that note
// 3. View all files attached to the note

export default function NoteScreen() {
    const { user } = useAuthStore();

  const [noteContent, setNoteContent] = useState("");
    const [noteId, setNoteId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [refreshFiles, setRefreshFiles] = useState(0);

  // Save note to Firestore and get the noteId to link files to it
  const handleSaveNote = async () => {
        if (!user || !noteContent.trim()) {
                Alert.alert("Empty note", "Please write something before saving.");
                return;
        }
        setIsSaving(true);
        try {
                const id = await createNote(user.id, noteContent.trim());
                setNoteId(id);
                Alert.alert("Saved!", "Your note has been saved. You can now attach files.");
        } catch (err: any) {
                Alert.alert("Error", err?.message ?? "Could not save note.");
        } finally {
                setIsSaving(false);
        }
  };

  return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
                <ScrollView
                          contentContainerStyle={{ flexGrow: 1 }}
                          keyboardShouldPersistTaps="handled"
                          showsVerticalScrollIndicator={false}
                        >
                        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}>
                        
                          {/* Header */}
                                  <Text style={{ color: "white", fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>
                                              New Note
                                  </Text>Text>
                                  <Text style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>
                                              Write your note then attach files
                                  </Text>Text>
                        
                          {/* Note editor */}
                                  <View style={{
                                      backgroundColor: "#1e293b", borderRadius: 16,
                                      borderWidth: 1, borderColor: "#334155",
                                      padding: 16, marginBottom: 12, minHeight: 160,
                        }}>
                                              <TextInput
                                                              multiline
                                                              placeholder="Start writing your note..."
                                                              placeholderTextColor="#475569"
                                                              value={noteContent}
                                                              onChangeText={setNoteContent}
                                                              style={{ color: "white", fontSize: 15, lineHeight: 24 }}
                                                              editable={!noteId} // lock after saving
                                                            />
                                  </View>View>
                        
                          {/* Save button — only show if note not yet saved */}
                          {!noteId && (
                                      <TouchableOpacity
                                                      onPress={handleSaveNote}
                                                      disabled={isSaving || !noteContent.trim()}
                                                      style={{
                                                                        backgroundColor: noteContent.trim() ? "#6366f1" : "#1e293b",
                                                                        borderRadius: 14, paddingVertical: 14,
                                                                        alignItems: "center", marginBottom: 24,
                                                                        opacity: isSaving ? 0.7 : 1,
                                                      }}
                                                    >
                                                    <Text style={{ color: noteContent.trim() ? "white" : "#475569", fontWeight: "700", fontSize: 15 }}>
                                                      {isSaving ? "Saving..." : "Save Note"}
                                                    </Text>Text>
                                      </TouchableOpacity>TouchableOpacity>
                                  )}
                        
                          {/* File section — only available after note is saved */}
                          {noteId ? (
                                      <View>
                                        {/* Note saved banner */}
                                                    <View style={{
                                                        flexDirection: "row", alignItems: "center", gap: 8,
                                                        backgroundColor: "rgba(16,185,129,0.1)",
                                                        borderWidth: 1, borderColor: "rgba(16,185,129,0.3)",
                                                        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                                                        marginBottom: 20,
                                      }}>
                                                                    <Ionicons name="checkmark-circle-outline" size={18} color="#10b981" />
                                                                    <Text style={{ color: "#34d399", fontSize: 13, fontWeight: "600" }}>
                                                                                      Note saved — you can now attach files
                                                                    </Text>Text>
                                                    </View>View>
                                      
                                        {/* File upload section title */}
                                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                                                    <Ionicons name="attach-outline" size={20} color="#6366f1" />
                                                                    <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
                                                                                      Attached Files
                                                                    </Text>Text>
                                                    </View>View>
                                      
                                        {/* FileUploader — PDF and image picker */}
                                                    <FileUploader
                                                                      userId={user!.id}
                                                                      noteId={noteId}
                                                                      onUploadComplete={() => setRefreshFiles((r) => r + 1)}
                                                                    />
                                      
                                        {/* FileList — displays all uploaded files */}
                                                    <FileList
                                                                      userId={user!.id}
                                                                      noteId={noteId}
                                                                      refreshTrigger={refreshFiles}
                                                                    />
                                      </View>View>
                                    ) : (
                                      /* Placeholder shown before saving */
                                      <View style={{
                                                      borderWidth: 2, borderStyle: "dashed", borderColor: "#334155",
                                                      borderRadius: 16, padding: 24, alignItems: "center", gap: 8,
                                      }}>
                                                    <Ionicons name="attach-outline" size={28} color="#334155" />
                                                    <Text style={{ color: "#475569", fontSize: 13, textAlign: "center" }}>
                                                                    Save your note first to attach PDF or image files
                                                    </Text>Text>
                                      </View>View>
                                  )}
                        
                        </View>View>
                </ScrollView>ScrollView>
        </SafeAreaView>SafeAreaView>
      );
}</ScrollView>
