/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

//import {onRequest} from "firebase-functions/v2/https";
//import * as logger from "firebase-functions/logger";
import { summarize } from "./summarize";
import { generateQuiz } from "./quiz";
import { generatePlan } from "./plan";

export { summarize, generateQuiz, generatePlan };

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
// ── explainText ──────────────────────────────────────────
export const explainText = onCall(
  { region: "us-central1", secrets: ["OPENAI_API_KEY"] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Connexion requise.");
    }
    const { text, difficulty } = request.data;
    if (!text || text.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Texte requis.");
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es un tuteur pédagogique. Explique le texte fourni de façon claire, 
          niveau ${difficulty || "moyen"}. Réponds UNIQUEMENT en JSON valide :
          {
            "explanation": "explication complète en français",
            "keyPoints": ["point clé 1", "point clé 2", "point clé 3"],
            "difficulty": "facile|moyen|difficile"
          }`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.5,
    });

    const raw = completion.choices[0].message.content || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  }
);

// ── solveExercise ─────────────────────────────────────────
export const solveExercise = onCall(
  { region: "us-central1", secrets: ["OPENAI_API_KEY"] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Connexion requise.");
    }
    const { exercise, subject } = request.data;
    if (!exercise || exercise.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Exercice requis.");
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es un professeur expert en ${subject || "toutes matières"}.
          Résous l'exercice étape par étape. Réponds UNIQUEMENT en JSON valide :
          {
            "solution": "réponse finale claire",
            "steps": ["étape 1", "étape 2", "étape 3"],
            "subject": "matière détectée"
          }`,
        },
        { role: "user", content: exercise },
      ],
      temperature: 0.3,
    });

    const raw = completion.choices[0].message.content || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  }
);

// ── generateFlashcards ────────────────────────────────────
export const generateFlashcards = onCall(
  { region: "us-central1", secrets: ["OPENAI_API_KEY"] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Connexion requise.");
    }
    const { topic, count } = request.data;
    if (!topic || topic.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Sujet requis.");
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const nbCards = Math.min(count || 8, 20);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es un expert en mémorisation. Crée ${nbCards} flashcards sur le sujet donné.
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
    });

    const raw = completion.choices[0].message.content || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  }
);