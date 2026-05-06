import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

export const deleteAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Non authentifié.");

  const db = admin.firestore();
  const auth = admin.auth();

  try {
    // 1. Récupérer l'email avant suppression
    const userRecord = await auth.getUser(uid);
    const email = userRecord.email || "";

    // 2. Hash anonymisé de l'email
    const hashedEmail = crypto
      .createHash("sha256")
      .update(email.toLowerCase())
      .digest("hex");

    // 3. Supprimer toutes les données Firestore de l'utilisateur
    const collections = [
      "quizzes", "flashcards", "plans", "summaries",
      "explanations", "solutions", "chatSessions",
    ];

    for (const col of collections) {
      const snap = await db.collection(col)
        .where("userId", "==", uid)
        .get();
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      if (!snap.empty) await batch.commit();
    }

    // Supprimer usage
    const usageSnap = await db.collection("usage")
      .where("userId", "==", uid)
      .get();
    const usageBatch = db.batch();
    usageSnap.docs.forEach((d) => usageBatch.delete(d.ref));
    if (!usageSnap.empty) await usageBatch.commit();

    // Supprimer cache IA
    const cacheSnap = await db.collection("aiCache")
      .where("userId", "==", uid)
      .get();
    if (!cacheSnap.empty) {
      const cacheBatch = db.batch();
      cacheSnap.docs.forEach((d) => cacheBatch.delete(d.ref));
      await cacheBatch.commit();
    }

    // Supprimer consentement parental
    await db.collection("parental_consents").doc(uid).delete().catch(() => {});

    // Supprimer profil utilisateur
    await db.collection("users").doc(uid).delete().catch(() => {});

    // 4. Trace anonymisée
    await db.collection("deleted_users").add({
      hashedEmail,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      reason: "user_request",
    });

    // 5. Supprimer le compte Auth
    await auth.deleteUser(uid);

    return { success: true };
  } catch (e: any) {
    throw new HttpsError("internal", e.message || "Erreur suppression.");
  }
});