import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCHTHN6P_drQxCehbhtVqmWrge9Ell76Cw",
  authDomain: "studyai-82cd7.firebaseapp.com",
  projectId: "studyai-82cd7",
  storageBucket: "studyai-82cd7.firebasestorage.app",
  messagingSenderId: "369068414875",
  appId: "1:369068414875:web:151f86bc91d29383eaf33e",
  measurementId: "G-G56B46YZF7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;