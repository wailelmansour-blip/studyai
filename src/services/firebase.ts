import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Remplace ces valeurs par celles de ta console Firebase :
// https://console.firebase.google.com -> ton projet -> Paramètres -> Config web
const firebaseConfig = {
  apiKey:            "REPLACE_WITH_YOUR_API_KEY",
    authDomain:        "REPLACE_WITH_YOUR_AUTH_DOMAIN",
      projectId:         "REPLACE_WITH_YOUR_PROJECT_ID",
        storageBucket:     "REPLACE_WITH_YOUR_STORAGE_BUCKET",
          messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
            appId:             "REPLACE_WITH_YOUR_APP_ID",
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
