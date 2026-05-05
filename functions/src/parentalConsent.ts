import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { Resend } from "resend";

const resendKey = defineSecret("RESEND_API_KEY");

// ── Envoyer email de consentement au parent ────────────────────────────────
export const sendParentalConsent = onRequest(
  { region: "us-central1", secrets: [resendKey], invoker: "public" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { parentEmail, childName, language = "fr", uid } = req.body;

    if (!uid) {
      res.status(400).json({ error: "UID manquant." });
      return;
    }

    if (!parentEmail || !parentEmail.includes("@")) {
      res.status(400).json({ error: "Email parent invalide." });
      return;
    }

    try {
      const db = admin.firestore();
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await db.collection("parental_consents").doc(uid).set({
        userId: uid,
        parentEmail,
        childName,
        token,
        status: "pending",
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await db.collection("users").doc(uid).update({
        parentEmail,
        parentalConsentStatus: "pending",
      });

      const approveUrl = `https://us-central1-studyai-ab88e.cloudfunctions.net/approveParentalConsent?token=${token}&uid=${uid}`;
      const rejectUrl  = `https://us-central1-studyai-ab88e.cloudfunctions.net/approveParentalConsent?token=${token}&uid=${uid}&action=reject`;

      const subject =
        language === "ar" ? "طلب موافقة ولي الأمر — StudyAI"
        : language === "en" ? "Parental Consent Request — StudyAI"
        : "Demande de consentement parental — StudyAI";

      const html = buildEmail(childName, approveUrl, rejectUrl, language);

      const resend = new Resend(resendKey.value());
      await resend.emails.send({
        from: "StudyAI <onboarding@resend.dev>",
        to: parentEmail,
        subject,
        html,
      });

      res.status(200).json({ success: true });
    } catch (e: any) {
      console.error("sendParentalConsent error:", e);
      res.status(500).json({ error: e.message || "Erreur interne." });
    }
  }
);

// ── Approuver ou rejeter via lien email ────────────────────────────────────
export const approveParentalConsent = onRequest(
  { region: "us-central1", secrets: [resendKey] },
  async (req, res) => {
    const { token, uid, action } = req.query as Record<string, string>;

    if (!token || !uid) {
      res.status(400).send(pageError("Token invalide."));
      return;
    }

    const db = admin.firestore();
    const consentRef = db.collection("parental_consents").doc(uid);
    const consentDoc = await consentRef.get();

    if (!consentDoc.exists) {
      res.status(404).send(pageError("Demande introuvable ou expirée."));
      return;
    }

    const consent = consentDoc.data()!;

    if (consent.token !== token) {
      res.status(403).send(pageError("Token invalide."));
      return;
    }

    if (consent.expiresAt.toDate() < new Date()) {
      res.status(410).send(pageError("Cette demande a expiré."));
      return;
    }

    if (consent.status !== "pending") {
      res.status(200).send(pageAlreadyDone());
      return;
    }

    const isApproved = action !== "reject";
    await consentRef.update({ status: isApproved ? "approved" : "rejected" });
    await db.collection("users").doc(uid).update({
      parentalConsentStatus: isApproved ? "approved" : "rejected",
      isVerified: isApproved,
    });

    res.status(200).send(isApproved ? pageSuccess() : pageRejected());
  }
);

// ── Builder email HTML ─────────────────────────────────────────────────────
function buildEmail(childName: string, approveUrl: string, rejectUrl: string, lang: string): string {
  const content = lang === "ar" ? {
    dir: "rtl",
    tagline: "منصة التعلم الذكي",
    title: "طلب موافقة ولي الأمر",
    greeting: "عزيزي ولي الأمر،",
    body: `يطلب طفلك <strong style="color:#6366F1;">${childName}</strong> إنشاء حساب على منصة <strong>StudyAI</strong>، وهي منصة تعليمية آمنة تساعد الطلاب على الدراسة باستخدام الذكاء الاصطناعي.`,
    featuresTitle: "ما تقدمه StudyAI:",
    features: ["تلخيص الدروس تلقائياً", "اختبارات تفاعلية وبطاقات تعليمية", "خطط دراسة مخصصة", "مساعد ذكي محدود بالمادة الدراسية فقط"],
    expiry: "يرجى النقر على أحد الزرين أدناه للموافقة أو الرفض. <strong>ينتهي هذا الطلب خلال 48 ساعة.</strong>",
    approveBtn: "✅ أوافق على إنشاء الحساب",
    rejectBtn: "❌ أرفض هذا الطلب",
    footer: "إذا لم تطلب هذا، تجاهل هذا البريد الإلكتروني.",
    footerSub: "StudyAI — منصة تعليمية آمنة للطلاب",
    borderSide: "border-right:4px solid #6366F1;",
    listPadding: "padding-right:20px;",
  } : lang === "en" ? {
    dir: "ltr",
    tagline: "Smart Learning Platform",
    title: "Parental Consent Required",
    greeting: "Dear Parent or Guardian,",
    body: `Your child <strong style="color:#6366F1;">${childName}</strong> is requesting to create an account on <strong>StudyAI</strong>, a safe educational platform that helps students study using artificial intelligence.`,
    featuresTitle: "What StudyAI offers:",
    features: ["Automatic lesson summaries", "Interactive quizzes and flashcards", "Personalized study plans", "AI assistant limited to academic subjects only"],
    expiry: "Please click one of the buttons below to approve or reject. <strong>This request expires in 48 hours.</strong>",
    approveBtn: "✅ Approve Account Creation",
    rejectBtn: "❌ Reject this Request",
    footer: "If you did not request this, please ignore this email.",
    footerSub: "StudyAI — Safe Educational Platform for Students",
    borderSide: "border-left:4px solid #6366F1;",
    listPadding: "padding-left:20px;",
  } : {
    dir: "ltr",
    tagline: "Plateforme d'apprentissage intelligent",
    title: "Consentement parental requis",
    greeting: "Cher(e) parent ou tuteur(trice),",
    body: `Votre enfant <strong style="color:#6366F1;">${childName}</strong> souhaite créer un compte sur <strong>StudyAI</strong>, une plateforme éducative sécurisée qui aide les élèves à étudier grâce à l'intelligence artificielle.`,
    featuresTitle: "Ce que propose StudyAI :",
    features: ["Résumés automatiques des cours", "Quiz interactifs et fiches de révision", "Plans d'étude personnalisés", "Assistant IA limité aux matières scolaires uniquement"],
    expiry: "Veuillez cliquer sur l'un des boutons ci-dessous pour approuver ou refuser. <strong>Cette demande expire dans 48 heures.</strong>",
    approveBtn: "✅ Approuver la création du compte",
    rejectBtn: "❌ Refuser cette demande",
    footer: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
    footerSub: "StudyAI — Plateforme éducative sécurisée pour les élèves",
    borderSide: "border-left:4px solid #6366F1;",
    listPadding: "padding-left:20px;",
  };

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${content.dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${content.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8F9FA;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F9FA;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366F1,#8B5CF6);padding:40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">🎓</div>
            <h1 style="color:#FFFFFF;font-size:28px;margin:0;font-weight:700;">StudyAI</h1>
            <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:8px 0 0;">${content.tagline}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;direction:${content.dir};">
            <h2 style="color:#111827;font-size:22px;margin:0 0 16px;font-weight:700;">${content.title}</h2>
            <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${content.greeting}</p>
            <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">${content.body}</p>

            <!-- Features -->
            <div style="background:#EEF2FF;border-radius:12px;padding:20px;margin:0 0 24px;${content.borderSide}">
              <h3 style="color:#3730A3;font-size:15px;margin:0 0 12px;font-weight:700;">${content.featuresTitle}</h3>
              <ul style="color:#4338CA;font-size:14px;margin:0;${content.listPadding}line-height:1.8;">
                ${content.features.map((f) => `<li>${f}</li>`).join("")}
              </ul>
            </div>

            <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 32px;">${content.expiry}</p>

            <!-- Buttons -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:12px;">
                  <a href="${approveUrl}" style="display:block;background:linear-gradient(135deg,#10B981,#059669);color:#FFFFFF;text-decoration:none;padding:16px 32px;border-radius:12px;font-size:16px;font-weight:700;text-align:center;">
                    ${content.approveBtn}
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <a href="${rejectUrl}" style="display:block;background:#F3F4F6;color:#6B7280;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:600;text-align:center;border:1px solid #E5E7EB;">
                    ${content.rejectBtn}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;padding:24px 40px;border-top:1px solid #F3F4F6;text-align:center;">
            <p style="color:#9CA3AF;font-size:12px;margin:0;line-height:1.6;">
              ${content.footer}<br>
              ${content.footerSub}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Pages de réponse ───────────────────────────────────────────────────────
function pageSuccess(): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Compte approuvé</title></head>
<body style="margin:0;padding:40px 20px;background:#F8F9FA;font-family:Arial,sans-serif;text-align:center;">
  <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:48px 32px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="font-size:64px;margin-bottom:24px;">✅</div>
    <h1 style="color:#111827;font-size:24px;margin:0 0 12px;">Compte approuvé !</h1>
    <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 32px;">
      Vous avez approuvé la création du compte StudyAI pour votre enfant. Il peut maintenant accéder à la plateforme.
    </p>
    <div style="background:#F0FDF4;border-radius:12px;padding:16px;border:1px solid #BBF7D0;">
      <p style="color:#065F46;font-size:14px;margin:0;">🎓 StudyAI — Plateforme éducative sécurisée</p>
    </div>
  </div>
</body></html>`;
}

function pageRejected(): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demande refusée</title></head>
<body style="margin:0;padding:40px 20px;background:#F8F9FA;font-family:Arial,sans-serif;text-align:center;">
  <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:48px 32px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="font-size:64px;margin-bottom:24px;">❌</div>
    <h1 style="color:#111827;font-size:24px;margin:0 0 12px;">Demande refusée</h1>
    <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 32px;">
      Vous avez refusé la création du compte. Le compte de votre enfant ne sera pas activé.
    </p>
    <div style="background:#FEF2F2;border-radius:12px;padding:16px;border:1px solid #FECACA;">
      <p style="color:#991B1B;font-size:14px;margin:0;">Le compte a été désactivé avec succès.</p>
    </div>
  </div>
</body></html>`;
}

function pageError(msg: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Erreur</title></head>
<body style="margin:0;padding:40px 20px;background:#F8F9FA;font-family:Arial,sans-serif;text-align:center;">
  <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:48px 32px;">
    <div style="font-size:64px;margin-bottom:24px;">⚠️</div>
    <h1 style="color:#111827;font-size:24px;margin:0 0 12px;">Erreur</h1>
    <p style="color:#6B7280;font-size:15px;">${msg}</p>
  </div>
</body></html>`;
}

function pageAlreadyDone(): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Déjà traité</title></head>
<body style="margin:0;padding:40px 20px;background:#F8F9FA;font-family:Arial,sans-serif;text-align:center;">
  <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:48px 32px;">
    <div style="font-size:64px;margin-bottom:24px;">ℹ️</div>
    <h1 style="color:#111827;font-size:24px;margin:0 0 12px;">Déjà traité</h1>
    <p style="color:#6B7280;font-size:15px;">Cette demande a déjà été traitée.</p>
  </div>
</body></html>`;
}