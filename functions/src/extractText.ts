// functions/src/extractText.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

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

    const openai = new OpenAI({ apiKey: openaiKey.value() });

    // ── PDF → OpenAI Files API ───────────────────────────────────
    if (type === "pdf") {
      let tempPath = "";
      let fileId = "";
      try {
        // 1. Écrire le PDF dans un fichier temporaire
        const buffer = Buffer.from(base64, "base64");
        tempPath = path.join(os.tmpdir(), `doc_${Date.now()}.pdf`);
        fs.writeFileSync(tempPath, buffer);

        // 2. Uploader le PDF vers OpenAI Files
        const uploadedFile = await openai.files.create({
          file: fs.createReadStream(tempPath),
          purpose: "assistants",
        });
        fileId = uploadedFile.id;

        // 3. Extraire le texte via Chat Completions + file_id
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 3000,
          messages: [
            {
              role: "user",
              content: [
                {
                  // @ts-ignore — file_id supporté par l'API mais pas encore typé
                  type: "file",
                  file: { file_id: fileId },
                },
                {
                  type: "text",
                  text: "Extrais tout le texte de ce document PDF. Retourne uniquement le texte extrait, sans commentaire ni formatage supplémentaire.",
                },
              ],
            },
          ],
        });

        const text = response.choices[0]?.message?.content?.trim();
        if (!text || text.length < 5) {
          throw new HttpsError("internal", "Aucun texte extrait du PDF.");
        }
        return { text: text.slice(0, 8000) };
      } catch (e: any) {
        if (e instanceof HttpsError) throw e;
        throw new HttpsError(
          "internal",
          "Erreur lecture PDF: " + (e?.message || "inconnue")
        );
      } finally {
        // 4. Nettoyage — supprimer fichier temp + fichier OpenAI
        if (tempPath && fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        if (fileId) {
          await openai.files.delete(fileId).catch(() => {});
        }
      }
    }

    // ── IMAGE → OpenAI Vision ────────────────────────────────────
    if (type === "image") {
      try {
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