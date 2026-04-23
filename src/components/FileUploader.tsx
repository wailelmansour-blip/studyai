import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { uploadFile, UploadProgress } from "../services/storageService";
import { saveFileRecord } from "../services/filesService";

interface FileUploaderProps {
    userId: string;
    noteId: string;
    onUploadComplete?: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ userId, noteId, onUploadComplete }) => {
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const upload = async (uri: string, name: string, mimeType: string) => {
          setIsUploading(true);
          setProgress({ progress: 0, status: "uploading" });
          try {
                  const result = await uploadFile(userId, noteId, uri, name, mimeType, setProgress);
                  await saveFileRecord(userId, noteId, {
                            noteId,
                            name: result.name,
                            url: result.url,
                            storagePath: result.path,
                            size: result.size,
                            type: result.type,
                  });
                  onUploadComplete?.();
          } catch (err: any) {
                  Alert.alert("Upload failed", err?.message ?? "Unknown error");
                  setProgress({ progress: 0, status: "error" });
          } finally {
                  setIsUploading(false);
                  setTimeout(() => setProgress(null), 2000);
          }
    };

    const pickDocument = async () => {
          const result = await DocumentPicker.getDocumentAsync({
                  type: ["application/pdf"],
                  copyToCacheDirectory: true,
          });
          if (result.canceled) return;
          const file = result.assets[0];
          await upload(file.uri, file.name, file.mimeType ?? "application/pdf");
    };

    const pickImage = async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
                  Alert.alert("Permission required", "Allow access to your photo library.");
                  return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  quality: 0.85,
          });
          if (result.canceled) return;
          const asset = result.assets[0];
          const name = asset.uri.split("/").pop() ?? `image_${Date.now()}.jpg`;
          await upload(asset.uri, name, asset.mimeType ?? "image/jpeg");
    };

    return (
          <View style={{ marginTop: 12 }}>
            {!isUploading && (
                    <View style={{ flexDirection: "row", gap: 10 }}>
                                <TouchableOpacity
                                              onPress={pickDocument}
                                              style={{
                                                              flex: 1, flexDirection: "row", alignItems: "center",
                                                              justifyContent: "center", gap: 6,
                                                              backgroundColor: "#1e293b", borderRadius: 14,
                                                              paddingVertical: 12, borderWidth: 1, borderColor: "#334155",
                                              }}
                                            >
                                            <Ionicons name="document-outline" size={18} color="#6366f1" />
                                            <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "600" }}>PDF</Text>Text>
                                </TouchableOpacity>TouchableOpacity>
                              <TouchableOpacity
                                            onPress={pickImage}
                                            style={{
                                                            flex: 1, flexDirection: "row", alignItems: "center",
                                                            justifyContent: "center", gap: 6,
                                                            backgroundColor: "#1e293b", borderRadius: 14,
                                                            paddingVertical: 12, borderWidth: 1, borderColor: "#334155",
                                            }}
                                          >
                                          <Ionicons name="image-outline" size={18} color="#10b981" />
                                          <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "600" }}>Image</Text>Text>
                              </TouchableOpacity>TouchableOpacity>
                    </View>View>
                )}
            {progress && (
                    <View style={{ marginTop: 10 }}>
                              <View style={{ height: 6, backgroundColor: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
                                          <View style={{
                                    height: 6, borderRadius: 99,
                                    width: `${progress.progress}%` as any,
                                    backgroundColor: progress.status === "error" ? "#ef4444" : progress.status === "done" ? "#10b981" : "#6366f1",
                    }} />
                              </View>View>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                                {isUploading && <ActivityIndicator size="small" color="#6366f1" />}
                                          <Text style={{ color: progress.status === "error" ? "#f87171" : progress.status === "done" ? "#34d399" : "#94a3b8", fontSize: 12 }}>
                                            {progress.status === "uploading" && `Uploading... ${progress.progress}%`}
                                            {progress.status === "done" && "Upload complete"}
                                            {progress.status === "error" && "Upload failed"}
                                          </Text>Text>
                              </View>View>
                    </View>View>
                )}
          </View>View>
        );
};</TouchableOpacity>
