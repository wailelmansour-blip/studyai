// src/config/firebase.ts
// Réexporte depuis src/services/firebase pour éviter la double init
export { auth, db, default } from "../services/firebase";