// functions/src/index.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";

import { summarize } from "./summarize";
import { generateQuiz } from "./quiz";
import { generatePlan } from "./plan";
import { chatAI } from "./chatAI";

export { summarize, generateQuiz, generatePlan, chatAI };
export { extractText } from "./extractText";

const openaiKey = defineSecret("OPENAI_API_KEY");

// ── explainText ───────────────────────────────────────────
export const explainText = onCall(
  { region: "us-central1", secrets: [openaiKey], invoker: "public" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Connexion requise.");
    }
    const { text, difficulty, language = "fr" } = request.data;
    if (!text || text.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Texte requis.");
    }

    const langInstruction =
      language === "ar"
        ? "اشرح النص باللغة العربية حصراً."
        : language === "en"
        ? "Explain the text exclusively in English."
        : "Explique le texte exclusivement en français.";

    const difficultyLabel =
      language === "ar"
        ? difficulty === "facile" ? "سهل" : difficulty === "difficile" ? "صعب" : "متوسط"
        : language === "en"
        ? difficulty === "facile" ? "easy" : difficulty === "difficile" ? "hard" : "medium"
        : difficulty || "moyen";

    const openai = new OpenAI({ apiKey: openaiKey.value() });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es un tuteur pédagogique. ${langInstruction}
Explique le texte fourni de façon claire, niveau ${difficultyLabel}.
Réponds UNIQUEMENT en JSON valide :
{
  "explanation": "explication complète",
  "keyPoints": ["point clé 1", "point clé 2", "point clé 3"],
  "difficulty": "${difficulty || "moyen"}"
}`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0].message.content || "{}";
    return JSON.parse(raw);
  }
);

// ── solveExercise ─────────────────────────────────────────
export const solveExercise = onCall(
  { region: "us-central1", secrets: [openaiKey], invoker: "public" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Connexion requise.");
    }
    const { exercise, subject, language = "fr" } = request.data;
    if (!exercise || exercise.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Exercice requis.");
    }

    const langInstruction =
      language === "ar"
        ? "أجب باللغة العربية حصراً. قدم الحل خطوة بخطوة."
        : language === "en"
        ? "Answer exclusively in English. Provide the solution step by step."
        : "Réponds exclusivement en français. Fournis la solution étape par étape.";

    const openai = new OpenAI({ apiKey: openaiKey.value() });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es un professeur expert en ${subject || "toutes matières"}. ${langInstruction}
Réponds UNIQUEMENT en JSON valide :
{
  "solution": "réponse finale claire",
  "steps": ["étape 1", "étape 2", "étape 3"],
  "subject": "matière détectée"
}`,
        },
        { role: "user", content: exercise },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0].message.content || "{}";
    return JSON.parse(raw);
  }
);

// ── generateFlashcards ────────────────────────────────────
export const generateFlashcards = onCall(
  { region: "us-central1", secrets: [openaiKey], invoker: "public" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Connexion requise.");
    }
    const { topic, count, language = "fr" } = request.data;
    if (!topic || topic.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Sujet requis.");
    }

    const langInstruction =
      language === "ar"
        ? "أنشئ الأسئلة والأجوبة باللغة العربية حصراً."
        : language === "en"
        ? "Generate all questions and answers exclusively in English."
        : "Génère toutes les questions et réponses exclusivement en français.";

    const openai = new OpenAI({ apiKey: openaiKey.value() });
    const nbCards = Math.min(count || 8, 20);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es un expert en mémorisation. ${langInstruction}
Crée ${nbCards} flashcards sur le sujet donné.
Réponds UNIQUEMENT en JSON valide :
{
  "flashcards": [
    { "question": "question courte", "answer": "réponse concise" }
  ]
}`,
        },
        { role: "user", content: topic },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0].message.content || "{}";
    return JSON.parse(raw);
  }
);