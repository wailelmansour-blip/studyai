// functions/src/extractText.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";

const openaiKey = defineSecret("OPENAI_API_KEY");

export const extractText = onCall(
  { secrets: [openaiKey], region: "us-central1", invoker: "public" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Connexion requise.");
    }

    const { type, base64, mimeType } = request.data ?? {};

    if (!type || !base64) {
      throw new HttpsError("invalid-argument", "type et base64 requis.");
    }

    // ── PDF ou IMAGE → OpenAI Vision ─────────────────────────────
    // On utilise OpenAI Vision pour les deux types
    // PDF envoyé comme image (première page) ou image directement
    try {
      const openai = new OpenAI({ apiKey: openaiKey.value() });

      // Déterminer le mimeType correct
      let imageMimeType = "image/jpeg";
      if (type === "pdf") {
        imageMimeType = "application/pdf";
      } else if (mimeType) {
        imageMimeType = mimeType;
      }

      const dataUrl = `data:${imageMimeType};base64,${base64}`;

      const prompt = type === "pdf"
        ? "Ce fichier est un PDF. Extrais tout le texte visible. Retourne uniquement le texte extrait, sans commentaire ni formatage supplémentaire."
        : "Extrais tout le texte visible dans cette image. Retourne uniquement le texte extrait, sans commentaire ni formatage supplémentaire.";

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: dataUrl, detail: "high" },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      });

      const text = response.choices[0]?.message?.content?.trim();
      if (!text || text.length < 5) {
        throw new HttpsError("internal", "Aucun texte détecté.");
      }
      return { text: text.slice(0, 8000) };
    } catch (e: any) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError("internal", "Erreur extraction: " + (e?.message || "inconnue"));
    }
  }
);