// hooks/useAnalytics.ts
// Phase 17 — Hook pour tracker les appels IA avec durée automatique
import { useRef } from "react";
import { trackAICall, trackConversion, trackScreenView, AIScreen, ConversionType } from "../services/analytics";

export const useAnalytics = (screen: AIScreen) => {
  const startTimeRef = useRef<number>(0);

  // Appeler avant le httpsCallable
  const startTracking = () => {
    startTimeRef.current = Date.now();
  };

  // Appeler après le httpsCallable (succès ou catch)
  const endTracking = (success: boolean, fromCache = false) => {
    const durationMs = Date.now() - startTimeRef.current;
    trackAICall(screen, success, durationMs, fromCache);
  };

  const trackConv = (type: ConversionType) => {
    trackConversion(type, screen);
  };

  const trackView = () => {
    trackScreenView(screen);
  };

  return { startTracking, endTracking, trackConv, trackView };
};