// ── Input validation utilities ────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Validate email format */
export const validateEmail = (email: string): ValidationResult => {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { valid: false, error: "Email requis" };
  if (trimmed.length > 200) return { valid: false, error: "Email trop long" };
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(trimmed)) return { valid: false, error: "Email invalide" };
  return { valid: true };
};

/** Validate password strength */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) return { valid: false, error: "Mot de passe requis" };
  if (password.length < 6) return { valid: false, error: "Minimum 6 caractères" };
  if (password.length > 128) return { valid: false, error: "Mot de passe trop long" };
  return { valid: true };
};

/** Validate display name */
export const validateName = (name: string): ValidationResult => {
  const trimmed = name.trim();
  if (!trimmed) return { valid: false, error: "Nom requis" };
  if (trimmed.length < 2) return { valid: false, error: "Minimum 2 caractères" };
  if (trimmed.length > 100) return { valid: false, error: "Nom trop long" };
  return { valid: true };
};

/** Validate note content */
export const validateNoteContent = (content: string): ValidationResult => {
  const trimmed = content.trim();
  if (!trimmed) return { valid: false, error: "La note ne peut pas être vide" };
  if (trimmed.length > 10000) return { valid: false, error: "Note trop longue (max 10 000 car.)" };
  return { valid: true };
};

/** Validate file before upload */
export const validateFile = (
  size: number,
  mimeType: string
): ValidationResult => {
  const MAX = 50 * 1024 * 1024; // 50 MB
  const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];

  if (size > MAX) return { valid: false, error: "Fichier trop volumineux (max 50 Mo)" };
  if (!ALLOWED.includes(mimeType)) return { valid: false, error: "Type de fichier non autorisé (PDF, JPG, PNG uniquement)" };
  return { valid: true };
};

/** Sanitize a string — removes leading/trailing whitespace and dangerous chars */
export const sanitize = (input: string): string =>
  input.trim().replace(/[<>]/g, "");

/** Check if a string is safe (no script injection) */
export const isSafeString = (input: string): boolean =>
  !/<script|javascript:|on\w+=/i.test(input);