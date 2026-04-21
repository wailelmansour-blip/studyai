/**
 * Format a duration in minutes to a readable string.
 * e.g. 90 → "1h 30m"
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

/**
 * Get a greeting based on current hour.
 */
export const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

/**
 * Clamp a number between min and max.
 */
export const clamp = (val: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, val));

/**
 * Capitalise first letter of a string.
 */
export const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);
