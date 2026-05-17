// services/googleAuth.ts
import {
  GoogleAuthProvider,
  signInWithCredential,
  getAuth,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import app from "../src/config/firebase";

// Import conditionnel pour éviter le crash dans Expo Go
let GoogleSignin: any = null;
let statusCodes: any = {
  SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  IN_PROGRESS: "IN_PROGRESS",
};

try {
  const module = require("@react-native-google-signin/google-signin");
  GoogleSignin = module.GoogleSignin;
  statusCodes = module.statusCodes;
} catch (e) {
  console.log("Google Sign-In not available in Expo Go");
}

const auth = getAuth(app);
const db = getFirestore(app);

export const configureGoogleSignIn = () => {
  if (!GoogleSignin) return;
  GoogleSignin.configure({
    webClientId: "890891684306-fql2d3ub6i04risnuab7bfb9faloi4hq.apps.googleusercontent.com",
    offlineAccess: false,
    scopes: ["profile", "email"],
  });
};

export type GoogleSignInResult =
  | { status: "success"; isNewUser: boolean; isChild: boolean; uid: string; firstName: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
  if (!GoogleSignin) {
    return { status: "error", message: "Google Sign-In not available in Expo Go" };
  }

  try {
    await GoogleSignin.hasPlayServices();
    await GoogleSignin.signIn();
    const { idToken } = await GoogleSignin.getTokens();

    if (!idToken) throw new Error("No ID token received from Google");

    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        status: "success",
        isNewUser: false,
        isChild: data.isChild || false,
        uid: user.uid,
        firstName: data.firstName || user.displayName?.split(" ")[0] || "",
      };
    }

    const displayName = user.displayName || "";
    const nameParts = displayName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    await setDoc(userRef, {
      firstName,
      lastName,
      email: user.email,
      isChild: false,
      plan: "free",
      isVerified: true,
      parentalConsentStatus: null,
      createdAt: new Date().toISOString(),
      provider: "google",
    });

    return {
      status: "success",
      isNewUser: true,
      isChild: false,
      uid: user.uid,
      firstName,
    };
  } catch (e: any) {
    if (e.code === statusCodes.SIGN_IN_CANCELLED) {
      return { status: "cancelled" };
    }
    if (e.code === statusCodes.IN_PROGRESS) {
      return { status: "cancelled" };
    }
    return { status: "error", message: e.message || "Google Sign-In failed" };
  }
};

export const useGoogleAuth = () => {
  return {
    promptAsync: async () => {},
    response: null,
    request: null,
    handleGoogleResponse: async () => ({ status: "cancelled" as const }),
  };
};