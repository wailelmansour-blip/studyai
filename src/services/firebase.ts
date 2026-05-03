// src/services/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCgQ__52nLlOybbAnQstQxk9B1x8aAe4kg",
  authDomain: "studyai-ab88e.firebaseapp.com",
  projectId: "studyai-ab88e",
  storageBucket: "studyai-ab88e.firebasestorage.app",
  messagingSenderId: "890891684306",
  appId: "1:890891684306:web:7054ca62293c10b8e3200b",
  measurementId: "G-FTTHYHV7PM",
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