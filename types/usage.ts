// types/usage.ts
export type UserPlan = "free" | "premium";

export interface UsageRecord {
  userId: string;
  date: string;
  count: number;
  fileCount: number;
  plan: UserPlan;
  updatedAt: string;
}

export const LIMITS: Record<UserPlan, number> = {
  free: 5,
  premium: 50,
};

export const FILE_LIMITS: Record<UserPlan, number> = {
  free: 1,
  premium: 10,
};