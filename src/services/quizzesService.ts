import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

export interface Quiz {
  id?: string;
  questions: QuizQuestion[];
  score?: number;
  subject?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const quizzesCol = (userId: string) => collection(db, "users", userId, "quizzes");
const quizDoc = (userId: string, quizId: string) => doc(db, "users", userId, "quizzes", quizId);

export const createQuiz = async (userId: string, questions: QuizQuestion[], subject?: string): Promise<string> => {
  const ref = await addDoc(quizzesCol(userId), {
    questions,
    subject: subject ?? null,
    score: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const getQuiz = async (userId: string, quizId: string): Promise<Quiz | null> => {
  const snap = await getDoc(quizDoc(userId, quizId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Quiz;
};

export const getQuizzes = async (userId: string): Promise<Quiz[]> => {
  const q = query(quizzesCol(userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Quiz));
};

export const saveQuizScore = async (userId: string, quizId: string, score: number): Promise<void> => {
  await updateDoc(quizDoc(userId, quizId), { score, updatedAt: serverTimestamp() });
};

export const updateQuiz = async (userId: string, quizId: string, questions: QuizQuestion[]): Promise<void> => {
  await updateDoc(quizDoc(userId, quizId), { questions, updatedAt: serverTimestamp() });
};

export const deleteQuiz = async (userId: string, quizId: string): Promise<void> => {
  await deleteDoc(quizDoc(userId, quizId));
};
