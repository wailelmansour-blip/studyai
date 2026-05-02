// functions/src/extractText.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";

const openaiKey = defineSecret("OPENAI_API_KEY");

// ── Extraction texte PDF sans librairie externe ──────────────────
function extractTextFromPDF(buffer: Buffer): string {
  const content = buffer.toString("binary");
  const results: string[] = [];

  // Extraire les blocs BT...ET (Begin Text / End Text)
  const btEtRegex = /BT([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(content)) !== null) {
    const block = match[1];
    // Extraire texte entre parenthèses (opérateurs Tj et TJ)
    const textRegex = /\(([^)\\]|\\.)*\)/g;
    let textMatch;
    while ((textMatch = textRegex.exec(block)) !== null) {
      const raw = textMatch[0].slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\")
        .replace(/\\(\d{3})/g, (_, oct) =>
          String.fromCharCode(parseInt(oct, 8))
        );
      if (raw.trim().length > 1) {
        results.push(raw);
      }
    }
  }

  // Fallback : extraire texte entre parenthèses si BT/ET absent
  if (results.length === 0) {
    const fallback = /\(([^\x00-\x1F\x7F-\xFF]{3,})\)/g;
    let fm;
    while ((fm = fallback.exec(content)) !== null) {
      results.push(fm[1]);
    }
  }

  return results.join(" ").replace(/\s+/g, " ").trim();
}

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

    // ── PDF → extraction locale (sans dépendance) ────────────────
    if (type === "pdf") {
      try {
        const buffer = Buffer.from(base64, "base64");
        const text = extractTextFromPDF(buffer);

        if (!text || text.length < 10) {
          throw new HttpsError(
            "internal",
            "PDF vide ou non lisible. Essaie de prendre une photo du document à la place."
          );
        }
        return { text: text.slice(0, 8000) };
      } catch (e: any) {
        if (e instanceof HttpsError) throw e;
        throw new HttpsError(
          "internal",
          "Erreur lecture PDF: " + (e?.message || "inconnue")
        );
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
        throw new HttpsError(
          "internal",
          "Erreur OCR image: " + (e?.message || "inconnue")
        );
      }
    }

    throw new HttpsError(
      "invalid-argument",
      "type doit être 'pdf' ou 'image'."
    );
  }
);