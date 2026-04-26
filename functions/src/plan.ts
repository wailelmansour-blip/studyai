// functions/src/plan.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";

const openaiKey = defineSecret("OPENAI_API_KEY");

export const generatePlan = onCall(
  { secrets: [openaiKey], region: "us-central1", invoker: "public" },
  async (request) => {

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Connexion requise.");
    }

    const { subjects, daysPerWeek = 5, hoursPerDay = 2, language = "fr" } = request.data ?? {};

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      throw new HttpsError("invalid-argument", "Champ 'subjects' requis (tableau non vide).");
    }
    if (subjects.length > 10) {
      throw new HttpsError("invalid-argument", "Maximum 10 matières.");
    }
    if (typeof daysPerWeek !== "number" || daysPerWeek < 1 || daysPerWeek > 7) {
      throw new HttpsError("invalid-argument", "daysPerWeek doit être entre 1 et 7.");
    }
    if (typeof hoursPerDay !== "number" || hoursPerDay < 1 || hoursPerDay > 12) {
      throw new HttpsError("invalid-argument", "hoursPerDay doit être entre 1 et 12.");
    }

    const langInstruction =
      language === "ar"
        ? "أنشئ الخطة والجدول والنصائح باللغة العربية حصراً. استخدم أسماء الأيام بالعربية: الاثنين، الثلاثاء، الأربعاء، الخميس، الجمعة، السبت، الأحد."
        : language === "en"
        ? "Generate the plan, schedule and tips exclusively in English. Use English day names: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday."
        : "Génère le plan, le planning et les conseils exclusivement en français. Utilise les noms de jours en français: Lundi, Mardi, Mercredi, Jeudi, Vendredi, Samedi, Dimanche.";

    const openai = new OpenAI({ apiKey: openaiKey.value() });

    const subjectsList = subjects
      .filter((s: any) => typeof s === "string" && s.length <= 100)
      .join(", ");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es un coach pédagogique expert. ${langInstruction}
Crée un planning d'étude hebdomadaire structuré et motivant.
Réponds UNIQUEMENT avec un JSON valide avec ce format :
{
  "plan": "Description générale du plan",
  "schedule": {
    "Lundi": [{"subject": "...", "duration": "1h", "task": "..."}],
    "Mardi": [...],
    "Mercredi": [...],
    "Jeudi": [...],
    "Vendredi": [...],
    "Samedi": [...],
    "Dimanche": [...]
  },
  "tips": ["conseil 1", "conseil 2", "conseil 3"]
}`,
        },
        {
          role: "user",
          content: `Matières : ${subjectsList}
Jours d'étude par semaine : ${daysPerWeek}
Heures par jour : ${hoursPerDay}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new HttpsError("internal", "Réponse IA invalide.");
    }

    return parsed;
  }
);