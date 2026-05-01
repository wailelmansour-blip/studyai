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

    // ── PDF ──────────────────────────────────────────────────────
    if (type === "pdf") {
      try {
        // import dynamique pour éviter l'erreur ESM/CJS
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse");
        const buffer = Buffer.from(base64, "base64");
        const parsed = await pdfParse(buffer);
        const text = (parsed.text as string)?.trim();
        if (!text || text.length < 10) {
          throw new HttpsError("internal", "PDF vide ou non lisible.");
        }
        return { text: text.slice(0, 8000) };
      } catch (e: any) {
        if (e instanceof HttpsError) throw e;
        throw new HttpsError("internal", "Erreur lecture PDF: " + (e?.message || "inconnue"));
      }
    }

    // ── IMAGE → OpenAI Vision ────────────────────────────────────
    if (type === "image") {
      try {
        const openai = new OpenAI({ apiKey: openaiKey.value() });
        const dataUrl = `data:${mimeType || "image/jpeg"};base64,${base64}`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 2000,
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
                  text: "Extrais tout le texte visible dans cette image. Retourne uniquement le texte extrait, sans commentaire ni formatage supplémentaire.",
                },
              ],
            },
          ],
        });

        const text = response.choices[0]?.message?.content?.trim();
        if (!text || text.length < 5) {
          throw new HttpsError("internal", "Aucun texte détecté dans l'image.");
        }
        return { text: text.slice(0, 8000) };
      } catch (e: any) {
        if (e instanceof HttpsError) throw e;
        throw new HttpsError("internal", "Erreur OCR image: " + (e?.message || "inconnue"));
      }
    }

    throw new HttpsError("invalid-argument", "type doit être 'pdf' ou 'image'.");
  }
);