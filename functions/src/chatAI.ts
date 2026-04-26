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
2. Si la question n'est PAS liée à "${courseName}", retourne UNIQUEMENT ce JSON sans rien d'autre :
   {"answer": null, "rejected": true, "reason": "Cette question ne concerne pas le cours de ${courseName}."}
3. Si la question EST liée à "${courseName}", retourne UNIQUEMENT ce JSON sans rien d'autre :
   {"answer": "ta réponse complète ici", "rejected": false}
4. INTERDIT : N'écris JAMAIS le mot JSON, ni les balises \`\`\`json dans ta réponse answer
5. Pour les formules mathématiques dans "answer", utilise du texte lisible :
   - Intégrale : écris "intégrale de f(x)dx" ou "∫f(x)dx"
   - Fraction : écris "a/b" ou "(numérateur)/(dénominateur)"  
   - Racine carrée : écris "√x" ou "racine carrée de x"
   - Somme : écris "Σ" ou "somme de..."
   - Puissance : écris "x^2" ou "x²"
6. Réponds dans la même langue que la question
7. Sois pédagogique, clair et structuré`,
        },
        ...historyMessages,
        { role: "user", content: message },
      ],
      temperature: 0.4,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content || "{}";

    try {
      const parsed = JSON.parse(raw);
      // Nettoyer answer si elle contient du JSON ou des balises
      if (parsed.answer && typeof parsed.answer === "string") {
        parsed.answer = parsed.answer
          .replace(/```json[\s\S]*?```/g, "")
          .replace(/```[\s\S]*?```/g, "")
          .replace(/\{[\s\S]*?"answer"[\s\S]*?\}/g, "")
          .trim();
      }
      return parsed;
    } catch {
      return { answer: raw.replace(/```json|```/g, "").trim(), rejected: false };
    }
  }
);