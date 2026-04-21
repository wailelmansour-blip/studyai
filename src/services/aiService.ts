/**
 * aiService.ts
 * Mock AI service – replace fetch calls with your actual AI backend.
 */

export interface GeneratedFlashcard {
  front: string;
  back: string;
}

export interface GeneratedQuiz {
  question: string;
  options: string[];
  correct: number;
}

export const aiService = {
  /**
   * Generate flashcards from a given topic (mock).
   */
  generateFlashcards: async (
    topic: string,
    count = 5
  ): Promise<GeneratedFlashcard[]> => {
    await new Promise((r) => setTimeout(r, 1000));
    return Array.from({ length: count }, (_, i) => ({
      front: `Question ${i + 1} about "${topic}"`,
      back: `Answer ${i + 1} for "${topic}"`,
    }));
  },

  /**
   * Generate a quiz from a given topic (mock).
   */
  generateQuiz: async (
    topic: string,
    count = 5
  ): Promise<GeneratedQuiz[]> => {
    await new Promise((r) => setTimeout(r, 1200));
    return Array.from({ length: count }, (_, i) => ({
      question: `What is concept ${i + 1} in "${topic}"?`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct: Math.floor(Math.random() * 4),
    }));
  },

  /**
   * Generate a study plan (mock).
   */
  generateStudyPlan: async (subjects: string[]): Promise<string> => {
    await new Promise((r) => setTimeout(r, 800));
    return `Here's your personalized study plan for: ${subjects.join(", ")}`;
  },
};
