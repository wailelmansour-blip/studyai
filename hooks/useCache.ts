// hooks/useCache.ts
import { useState, useEffect, useCallback } from "react";
import { useCacheStore } from "../store/cacheStore";

interface UseCacheOptions<T> {
  key: string;
  userId: string;
  fetcher: () => Promise<T>;
  enabled?: boolean;
}

interface UseCacheResult<T> {
  data: T | null;
  isLoading: boolean;
  isFromCache: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  invalidate: () => Promise<void>;
}

export function useCache<T>({
  key,
  userId,
  fetcher,
  enabled = true,
}: UseCacheOptions<T>): UseCacheResult<T> {
  const { getItem, setItem, removeItem } = useCacheStore();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled || !userId) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Charger depuis le cache d'abord
      const cached = await getItem<T>(key, userId);
      if (cached !== null) {
        setData(cached);
        setIsFromCache(true);
        setIsLoading(false);
      }

      // 2. Sync avec Firebase en arrière-plan
      try {
        const fresh = await fetcher();
        setData(fresh);
        setIsFromCache(false);
        // Mettre à jour le cache
        await setItem(key, fresh, userId);
      } catch (fetchError: any) {
        // Si Firebase échoue mais qu'on a le cache, pas d'erreur
        if (cached === null) {
          setError(fetchError.message || "Erreur de chargement");
        }
      }
    } catch (e: any) {
      setError(e.message || "Erreur cache");
    } finally {
      setIsLoading(false);
    }
  }, [key, userId, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const fresh = await fetcher();
      setData(fresh);
      setIsFromCache(false);
      await setItem(key, fresh, userId);
    } catch (e: any) {
      setError(e.message || "Erreur refresh");
    } finally {
      setIsLoading(false);
    }
  }, [key, userId]);

  const invalidate = useCallback(async () => {
    await removeItem(`${userId}_${key}`);
    setData(null);
    setIsFromCache(false);
  }, [key, userId]);

  return { data, isLoading, isFromCache, error, refresh, invalidate };
}