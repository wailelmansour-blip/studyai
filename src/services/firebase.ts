// src/services/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCHTHN6P_drQxCehbhtVqmWrge9Ell76Cw",
  authDomain: "studyai-82cd7.firebaseapp.com",
  projectId: "studyai-82cd7",
  storageBucket: "studyai-82cd7.firebasestorage.app",
  messagingSenderId: "369068414875",
  appId: "1:369068414875:web:151f86bc91d29383eaf33e",
};

const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export default app;