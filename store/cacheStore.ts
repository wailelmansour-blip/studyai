// store/cacheStore.ts
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "studyai_cache_";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h en ms

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  userId: string;
}

interface CacheState {
  isReady: boolean;
  setItem: <T>(key: string, data: T, userId: string) => Promise<void>;
  getItem: <T>(key: string, userId: string) => Promise<T | null>;
  removeItem: (key: string) => Promise<void>;
  clearUserCache: (userId: string) => Promise<void>;
  clearAllCache: () => Promise<void>;
  isExpired: (timestamp: number) => boolean;
}

export const useCacheStore = create<CacheState>(() => ({
  isReady: true,

  isExpired: (timestamp: number) => {
    return Date.now() - timestamp > CACHE_TTL;
  },

  setItem: async <T>(key: string, data: T, userId: string) => {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        userId,
      };
      await AsyncStorage.setItem(
        `${CACHE_PREFIX}${userId}_${key}`,
        JSON.stringify(entry)
      );
    } catch (e) {
      console.log("Cache setItem error:", e);
    }
  },

  getItem: async <T>(key: string, userId: string): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${userId}_${key}`);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);

      // Vérifie que le cache appartient au bon user
      if (entry.userId !== userId) return null;

      // Vérifie l'expiration
      if (Date.now() - entry.timestamp > CACHE_TTL) {
        await AsyncStorage.removeItem(`${CACHE_PREFIX}${userId}_${key}`);
        return null;
      }

      return entry.data;
    } catch (e) {
      console.log("Cache getItem error:", e);
      return null;
    }
  },

  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (e) {
      console.log("Cache removeItem error:", e);
    }
  },

  clearUserCache: async (userId: string) => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const userKeys = keys.filter((k) =>
        k.startsWith(`${CACHE_PREFIX}${userId}_`)
      );
      await AsyncStorage.multiRemove(userKeys);
      console.log(`Cache cleared for user ${userId}: ${userKeys.length} items`);
    } catch (e) {
      console.log("Cache clearUserCache error:", e);
    }
  },

  clearAllCache: async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`All cache cleared: ${cacheKeys.length} items`);
    } catch (e) {
      console.log("Cache clearAllCache error:", e);
    }
  },
}));