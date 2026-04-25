// src/services/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCHTHN6P_drQxCehbhtVqmWrge9E1176Cw",
  authDomain: "studyai-82cd7.firebaseapp.com",
  projectId: "studyai-82cd7",
  storageBucket: "studyai-82cd7.firebasestorage.app",
  messagingSenderId: "369068414875",
  appId: "1:369068414875:web:151f86bc91d29383eaf33e",
};

const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;