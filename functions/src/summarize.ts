// functions/src/summarize.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";

const openaiKey = defineSecret("OPENAI_API_KEY");

export const summarize = onCall(
  {
    secrets: [openaiKey],
    region: "us-central1",
    invoker: "public",
  },
  async (request) => {
    const text = request.data?.text;
    if (!text || typeof text !== "string") {
      throw new HttpsError("invalid-argument", "Champ 'text' requis.");
    }
    if (text.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Le texte ne peut pas être vide.");
    }
    if (text.length > 50000) {
      throw new HttpsError("invalid-argument", "Texte trop long (max 50 000 caractères).");
    }

    const openai = new OpenAI({ apiKey: openaiKey.value() });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un assistant pédagogique. Résume le texte fourni de manière claire et concise en bullet points. Réponds dans la même langue que le texte.",
        },
        {
          role: "user",
          content: `Résume ce texte :\n\n${text}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.5,
    });

    const summary = completion.choices[0]?.message?.content ?? "";
    return { summary };
  }
);