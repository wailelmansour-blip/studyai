// types/ai.ts

export interface ExplainResult {
  id?: string;
  userId: string;
  inputText: string;
  explanation: string;
  keyPoints: string[];
  difficulty: "facile" | "moyen" | "difficile";
  createdAt: string;
}

export interface SolveResult {
  id?: string;
  userId: string;
  exercise: string;
  solution: string;
  steps: string[];
  subject: string;
  createdAt: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface FlashcardsResult {
  id?: string;
  userId: string;
  topic: string;
  flashcards: Flashcard[];
  createdAt: string;
}