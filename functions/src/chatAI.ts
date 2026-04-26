// functions/src/chatAI.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";

const openaiKey = defineSecret("OPENAI_API_KEY");

export const chatAI = onCall(
  { region: "us-central1", secrets: [openaiKey], invoker: "public" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Connexion requise.");
    }

    const { message, courseName, history } = request.data;

    if (!message || message.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Message requis.");
    }
    if (!courseName || courseName.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Cours requis.");
    }

    const openai = new OpenAI({ apiKey: openaiKey.value() });

    // Construire l'historique pour le contexte
    const historyMessages = (history || []).slice(-10).map((msg: any) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es un assistant pédagogique spécialisé UNIQUEMENT dans le cours de "${courseName}".
          
RÈGLES STRICTES :
1. Tu ne réponds QU'aux questions liées à "${courseName}"
2. Si la question n'est PAS liée à "${courseName}", réponds exactement : {"answer": null, "rejected": true, "reason": "Cette question ne concerne pas le cours de ${courseName}."}
3. Si la question EST liée à "${courseName}", réponds en JSON : {"answer": "ta réponse complète", "rejected": false}
4. Réponds TOUJOURS en JSON valide, dans la même langue que la question
5. Sois pédagogique, clair et concis`,
        },
        ...historyMessages,
        { role: "user", content: message },
      ],
      temperature: 0.4,
      max_tokens: 1000,
    });

    const raw = completion.choices[0].message.content || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();

    try {
      return JSON.parse(clean);
    } catch {
      return { answer: raw, rejected: false };
    }
  }
);