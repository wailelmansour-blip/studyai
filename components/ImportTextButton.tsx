// components/ImportTextButton.tsx
import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

interface Props {
  onTextExtracted: (text: string) => void;
  onBeforeImport?: () => Promise<boolean>;
  currentLanguage: string;
  isRTL: boolean;
}

export const ImportTextButton: React.FC<Props> = ({
  onTextExtracted,
  onBeforeImport,
  currentLanguage,
  isRTL,
}) => {
  const app = getApp();
  const functions = getFunctions(app, "us-central1");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const getLabel = (key: string) => {
    const labels: Record<string, Record<string, string>> = {
      import:       { fr: " Importer",                 en: " Import",                      ar: " استيراد" },
      pdf:          { fr: "📄 Depuis un PDF",           en: "📄 From a PDF",                ar: "📄 من ملف PDF" },
      image:        { fr: "🖼️ Depuis une image",        en: "🖼️ From an image",             ar: "🖼️ من صورة" },
      cancel:       { fr: "Annuler",                   en: "Cancel",                       ar: "إلغاء" },
      extracting:   { fr: "Extraction en cours...",    en: "Extracting...",                ar: "جارٍ الاستخراج..." },
      success:      { fr: "Texte extrait avec succès ✅", en: "Text extracted successfully ✅", ar: "تم استخراج النص بنجاح ✅" },
      error_pdf:    { fr: "Impossible de lire ce PDF.", en: "Cannot read this PDF.",        ar: "لا يمكن قراءة هذا الملف." },
      error_image:  { fr: "Impossible d'extraire le texte.", en: "Cannot extract text.",   ar: "لا يمكن استخراج النص." },
    };
    return labels[key]?.[currentLanguage] || labels[key]?.["fr"] || key;
  };

  const handlePDF = async () => {
    setShowModal(false);

    // Vérifier le quota fichiers avant d'ouvrir le picker
    if (onBeforeImport) {
      const allowed = await onBeforeImport();
      if (!allowed) return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setLoading(true);

      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fn = httpsCallable(functions, "extractText");
      const res = await fn({ type: "pdf", base64 });
      const data = res.data as any;

      if (data.text) {
        onTextExtracted(data.text);
        Alert.alert("✅", getLabel("success"));
      }
    } catch (e: any) {
      console.error("PDF extract error detail:", e?.message, e?.code);
      Alert.alert("Erreur", getLabel("error_pdf"));
    } finally {
      setLoading(false);
    }
  };

  const handleImage = async () => {
    setShowModal(false);

    // Vérifier le quota fichiers avant d'ouvrir la galerie
    if (onBeforeImport) {
      const allowed = await onBeforeImport();
      if (!allowed) return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission refusée", "Autorise l'accès à la galerie.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (!asset.base64) return;

      setLoading(true);

      const fn = httpsCallable(functions, "extractText");
      const res = await fn({
        type: "image",
        base64: asset.base64,
        mimeType: asset.mimeType || "image/jpeg",
      });
      const data = res.data as any;

      if (data.text) {
        onTextExtracted(data.text);
        Alert.alert("✅", getLabel("success"));
      }
    } catch (e: any) {
      console.error("Image extract error detail:", e?.message, e?.code);
      Alert.alert("Erreur", getLabel("error_image"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bouton principal */}
      <TouchableOpacity
        onPress={() => setShowModal(true)}
        disabled={loading}
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", justifyContent: "center",
          backgroundColor: "#F3F4F6", borderRadius: 12,
          padding: 12, marginBottom: 12,
          borderWidth: 1, borderColor: "#E5E7EB",
          gap: 8,
        }}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={{ fontSize: 14, color: "#6366F1", fontWeight: "600" }}>
              {getLabel("extracting")}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="attach-outline" size={18} color="#6366F1" />
            <Text style={{ fontSize: 14, color: "#6366F1", fontWeight: "600" }}>
              {getLabel("import")}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Modal choix PDF / Image */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={{
          flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}>
          <View style={{
            backgroundColor: "#FFFFFF", borderTopLeftRadius: 24,
            borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
          }}>
            <Text style={{
              fontSize: 16, fontWeight: "700", color: "#111827",
              marginBottom: 20, textAlign: "center",
            }}>
              {getLabel("import")}
            </Text>

            {/* Bouton PDF */}
            <TouchableOpacity
              onPress={handlePDF}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center", backgroundColor: "#EEF2FF",
                borderRadius: 14, padding: 16, marginBottom: 12, gap: 12,
              }}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: "#6366F1", alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="document-text-outline" size={22} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
                  {getLabel("pdf")}
                </Text>
                <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                  {currentLanguage === "ar" ? "يدعم جميع ملفات PDF"
                    : currentLanguage === "en" ? "Supports all PDF files"
                    : "Supporte tous les PDFs"}
                </Text>
              </View>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color="#6366F1" />
            </TouchableOpacity>

            {/* Bouton Image */}
            <TouchableOpacity
              onPress={handleImage}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center", backgroundColor: "#F0FDF4",
                borderRadius: 14, padding: 16, marginBottom: 20, gap: 12,
              }}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: "#10B981", alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="image-outline" size={22} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
                  {getLabel("image")}
                </Text>
                <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                  {currentLanguage === "ar" ? "يدعم جميع أنواع الصور"
                    : currentLanguage === "en" ? "Supports all image types"
                    : "Supporte tous les types d'images"}
                </Text>
              </View>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color="#10B981" />
            </TouchableOpacity>

            {/* Annuler */}
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={{
                borderRadius: 12, padding: 14, alignItems: "center",
                backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151" }}>
                {getLabel("cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};