// store/aiCacheStore.ts
// Phase 15 — Cache résultats IA pour éviter les appels dupliqués
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "studyai_ai_cache_";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

interface CacheEntry {
  result: any;
  timestamp: number;
  inputHash: string;
}

// Génère une clé unique basée sur les inputs
const hashInput = (screen: string, input: object): string => {
  const str = screen + JSON.stringify(input);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

// Lire depuis le cache
export const readAICache = async (
  screen: string,
  input: object
): Promise<any | null> => {
  try {
    const key = CACHE_PREFIX + hashInput(screen, input);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return entry.result;
  } catch {
    return null;
  }
};

// Écrire dans le cache
export const writeAICache = async (
  screen: string,
  input: object,
  result: any
): Promise<void> => {
  try {
    const key = CACHE_PREFIX + hashInput(screen, input);
    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
      inputHash: hashInput(screen, input),
    };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // silencieux
  }
};

// Vider le cache d'un écran
export const clearAICache = async (screen: string): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toDelete = keys.filter((k) => k.startsWith(CACHE_PREFIX + screen));
    await AsyncStorage.multiRemove(toDelete);
  } catch {}
};