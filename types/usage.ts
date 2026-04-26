// types/usage.ts

export type UserPlan = "free" | "premium";

export interface UsageRecord {
  userId: string;
  date: string;          // format "YYYY-MM-DD"
  count: number;         // requêtes utilisées aujourd'hui
  plan: UserPlan;
  updatedAt: string;
}

export const LIMITS: Record<UserPlan, number> = {
  free: 3,
  premium: 50,
};
