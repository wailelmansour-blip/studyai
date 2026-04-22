import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Remplace ces valeurs par celles de ta console Firebase :
// https://console.firebase.google.com -> ton projet -> Paramètres -> Config web
const firebaseConfig = {
  apiKey:            "AIzaSyCHTHN6P_drQxCehbhtVqmWrge9Ell76Cw",
  authDomain:        "studyai-82cd7.firebaseapp.com",
  projectId:         "studyai-82cd7",
  storageBucket:     "studyai-82cd7.firebasestorage.app",
  messagingSenderId: "369068414875",
  appId:             "1:369068414875:web:151f86bc91d29383eaf33e",
};

            // Evite d'initialiser Firebase deux fois en cas de hot-reload
            const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

            // Auth avec persistance AsyncStorage (la session survive aux redemarrages)
            export const auth = initializeAuth(app, {
              persistence: getReactNativePersistence(AsyncStorage),
              });

              // Firestore database
              export const db = getFirestore(app);

              export default app;
