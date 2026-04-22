import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export interface Note {
    id?: string;
    content: string;
    createdAt?: unknown;
    updatedAt?: unknown;
}

const notesCol = (userId: string) => collection(db, "users", userId, "notes");
const noteDoc = (userId: string, noteId: string) => doc(db, "users", userId, "notes", noteId);

export const createNote = async (userId: string, content: string): Promise<string> => {
    const ref = await addDoc(notesCol(userId), {
          content,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
    });
    return ref.id;
};

export const getNote = async (userId: string, noteId: string): Promise<Note | null> => {
    const snap = await getDoc(noteDoc(userId, noteId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Note;
};

export const getNotes = async (userId: string): Promise<Note[]> => {
    const q = query(notesCol(userId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Note));
};

export const updateNote = async (userId: string, noteId: string, content: string): Promise<void> => {
    await updateDoc(noteDoc(userId, noteId), { content, updatedAt: serverTimestamp() });
};

export const deleteNote = async (userId: string, noteId: string): Promise<void> => {
    await deleteDoc(noteDoc(userId, noteId));
};
