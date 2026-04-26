// types/chat.ts

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isRejected?: boolean;
}

export interface ChatSession {
  id?: string;
  userId: string;
  courseId: string;
  courseName: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}