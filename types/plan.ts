// types/plan.ts

export interface StudySession {
  day: string;
  subject: string;
  duration: number;
  tasks: string[];
  completed: boolean;
}

export interface StudyPlan {
  id?: string;
  userId: string;
  subjects: string[];
  examDate: string;
  totalDays: number;
  sessions: StudySession[];
  createdAt: string;
  title: string;
  tips?: string[];
}

export interface GeneratePlanInput {
  subjects: string[];
  examDate: string;
  hoursPerDay: number;
}