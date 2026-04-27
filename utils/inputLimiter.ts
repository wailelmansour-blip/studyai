// utils/inputLimiter.ts
// Phase 15 — Limite la taille des inputs pour réduire les coûts IA

// Limites par écran (en caractères)
export const INPUT_LIMITS = {
  summary:    3000,  // ~750 tokens
  explain:    2000,  // ~500 tokens
  solve:      1500,  // ~375 tokens
  quiz:        500,  // sujet court
  flashcards:  300,  // sujet court
  chat:        500,  // par message
  plan:        100,  // nom de matière
};

/**
 * Tronque le texte à la limite et prévient l'utilisateur
 * @returns { text, wasTruncated }
 */
export const limitInput = (
  text: string,
  screen: keyof typeof INPUT_LIMITS
): { text: string; wasTruncated: boolean } => {
  const limit = INPUT_LIMITS[screen];
  if (text.length <= limit) return { text, wasTruncated: false };

  // Tronquer à la dernière phrase complète avant la limite
  const truncated = text.substring(0, limit);
  const lastPeriod = Math.max(
    truncated.lastIndexOf("."),
    truncated.lastIndexOf("!"),
    truncated.lastIndexOf("?"),
    truncated.lastIndexOf("\n")
  );
  const finalText = lastPeriod > limit * 0.7
    ? truncated.substring(0, lastPeriod + 1)
    : truncated;

  return { text: finalText, wasTruncated: true };
};

/**
 * Retourne le message d'avertissement de troncature
 */
export const getTruncationMessage = (
  language: string,
  limit: number
): string => {
  if (language === "ar")
    return `تم اقتصار النص على ${limit} حرف لتحسين الأداء.`;
  if (language === "en")
    return `Text limited to ${limit} characters to optimize performance.`;
  return `Texte limité à ${limit} caractères pour optimiser les performances.`;
};