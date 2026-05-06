import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

export const cleanupUnverifiedAccounts = onSchedule(
  {
    schedule: "every 1 hours",
    region: "us-central1",
    timeZone: "UTC",
  },
  async () => {
    const db = admin.firestore();
    const auth = admin.auth();
    const now = new Date();
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h

    try {
      // Chercher les comptes non vérifiés créés il y a plus de 24h
      const snap = await db.collection("users")
        .where("isVerified", "==", false)
        .where("createdAt", "<=", cutoff.toISOString())
        .get();

      if (snap.empty) {
        console.log("Aucun compte expiré trouvé.");
        return;
      }

      console.log(`${snap.docs.length} compte(s) expiré(s) trouvé(s).`);

      for (const doc of snap.docs) {
        const uid = doc.id;
        const data = doc.data();

        // Vérifier si mineur avec consentement en attente
        const isChildPending = data.isChild && data.parentalConsentStatus === "pending";
        // Vérifier si email non vérifié
        const isEmailUnverified = !data.isVerified;

        if (!isChildPending && !isEmailUnverified) continue;

        try {
          // Vérifier dans Firebase Auth si l'email est vérifié
          const authUser = await auth.getUser(uid).catch(() => null);
          if (authUser?.emailVerified) {
            // Mettre à jour Firestore si Auth dit vérifié
            await doc.ref.update({ isVerified: true });
            continue;
          }

          // Supprimer les données Firestore
          const collections = [
            "quizzes", "flashcards", "plans", "summaries",
            "explanations", "solutions", "chatSessions",
          ];
          for (const col of collections) {
            const colSnap = await db.collection(col)
              .where("userId", "==", uid).get();
            const batch = db.batch();
            colSnap.docs.forEach((d) => batch.delete(d.ref));
            if (!colSnap.empty) await batch.commit();
          }

          // Supprimer consentement parental si existe
          await db.collection("parental_consents").doc(uid).delete().catch(() => {});

          // Supprimer le document utilisateur
          await doc.ref.delete();

          // Supprimer le compte Auth
          if (authUser) await auth.deleteUser(uid);

          console.log(`Compte ${uid} supprimé (non vérifié après 24h).`);
        } catch (e) {
          console.error(`Erreur suppression compte ${uid}:`, e);
        }
      }
    } catch (e) {
      console.error("cleanupUnverifiedAccounts error:", e);
    }
  }
);