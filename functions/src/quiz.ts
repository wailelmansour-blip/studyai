import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";

const openaiKey = defineSecret("OPENAI_API_KEY");

export const generateQuiz = onCall(
  { secrets: [openaiKey], region: "us-central1" },
  async (request) => {

    // 1. Authentification
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Connexion requise.");
    }

    // 2. Validation
    const { topic, count = 5 } = request.data ?? {};

    if (!topic || typeof topic !== "string") {
      throw new HttpsError("invalid-argument", "Champ 'topic' requis.");
    }
    if (topic.length > 500) {
      throw new HttpsError("invalid-argument", "Topic trop long (max 500 car.).");
    }
    if (typeof count !== "number" || count < 1 || count > 20) {
      throw new HttpsError("invalid-argument", "count doit être entre 1 et 20.");
    }

    // 3. Appel OpenAI
    const openai = new OpenAI({ apiKey: openaiKey.value() });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es un créateur de quiz pédagogique. 
Génère exactement ${count} questions QCM sur le sujet demandé.
Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après, avec ce format :
{
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct": 0
    }
  ]
}
"correct" est l'index (0-3) de la bonne réponse.`,
        },
        {
          role: "user",
          content: `Sujet : ${topic}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new HttpsError("internal", "Réponse IA invalide.");
    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new HttpsError("internal", "Format de quiz invalide.");
    }

    return { questions: parsed.questions };
  }
);