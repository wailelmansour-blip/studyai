import { getFunctions, httpsCallable } from "firebase/functions";
import app from "./firebase";

const functions = getFunctions(app, "us-central1");

// ── Summarize ─────────────────────────────────────────────────
export const callSummarize = async (text: string): Promise<string> => {
  const fn = httpsCallable<{ text: string }, { summary: string }>(
    functions, "summarize"
  );
  const result = await fn({ text });
  return result.data.summary;
};

// ── Generate Quiz ──────────────────────────────────────────────
export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

export const callGenerateQuiz = async (
  topic: string,
  count = 5
): Promise<QuizQuestion[]> => {
  const fn = httpsCallable
    { topic: string; count: number },
    { questions: QuizQuestion[] }
  >(functions, "generateQuiz");
  const result = await fn({ topic, count });
  return result.data.questions;
};

// ── Generate Plan ──────────────────────────────────────────────
export const callGeneratePlan = async (
  subjects: string[],
  daysPerWeek = 5,
  hoursPerDay = 2
): Promise<any> => {
  const fn = httpsCallable(functions, "generatePlan");
  const result = await fn({ subjects, daysPerWeek, hoursPerDay });
  return result.data;
};