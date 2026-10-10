import { FirebaseError, initializeApp, getApps } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  getToken,
  type AppCheck,
} from "firebase/app-check";
import {
  GoogleAuthProvider,
  OAuthProvider,
  getAuth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
};
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY?.trim();
const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION?.trim() || "us-central1";

const requiredConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
];

export const firebaseConfigured = requiredConfig.every(Boolean);

if (requiredConfig.some(Boolean) && !firebaseConfigured) {
  console.error(
    "Firebase Auth needs VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID.",
  );
}

export const firebaseApp = firebaseConfigured
  ? getApps()[0] ?? initializeApp(firebaseConfig)
  : null;

export const firebaseAppCheck: AppCheck | null =
  firebaseApp && appCheckSiteKey && typeof window !== "undefined"
    ? initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      })
    : null;
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const googleProvider = firebaseApp ? new GoogleAuthProvider() : null;
export const appleProvider = firebaseApp ? new OAuthProvider("apple.com") : null;

export class AuthApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "AuthApiError";
  }
}

type AuthApiOptions = {
  authenticated?: boolean;
};

export async function requestAuthApi<T>(
  endpoint: string,
  body: Record<string, string | boolean>,
  options: AuthApiOptions = {},
): Promise<T> {
  if (!firebaseApp || !firebaseAuth || !firebaseAppCheck) {
    throw new AuthApiError(
      "Secure account services aren't configured yet. Add the Firebase App Check site key and restart the site.",
    );
  }

  let appCheckToken: string;
  try {
    appCheckToken = (await getToken(firebaseAppCheck)).token;
  } catch {
    throw new AuthApiError("We couldn't verify this browser. Refresh the page and try again.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Firebase-AppCheck": appCheckToken,
  };
  if (options.authenticated) {
    const user = firebaseAuth.currentUser;
    if (!user) throw new AuthApiError("Sign in again and try that action once more.", 401);
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  const functionBase =
    import.meta.env.VITE_AUTH_FUNCTIONS_BASE_URL?.trim() ||
    `https://${functionsRegion}-${firebaseApp.options.projectId}.cloudfunctions.net`;
  let response: Response;
  try {
    response = await fetch(`${functionBase}/${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      credentials: "omit",
      mode: "cors",
      cache: "no-store",
    });
  } catch {
    throw new AuthApiError("We couldn't reach the secure account service. Please try again.");
  }

  let payload: { ok?: boolean; error?: string } | null = null;
  try {
    payload = (await response.json()) as { ok?: boolean; error?: string };
  } catch {
    throw new AuthApiError("The account service returned an invalid response.", response.status);
  }
  if (!response.ok || !payload.ok) {
    throw new AuthApiError(
      typeof payload.error === "string"
        ? payload.error
        : "We couldn't complete that request. Please try again.",
      response.status,
    );
  }
  return payload as T;
}

export function logSafeAuthError(event: string, error: unknown): void {
  const code = error instanceof FirebaseError ? error.code : "unexpected";
  console.error(JSON.stringify({ event, code }));
}

export function getFirebaseAuthMessage(error: unknown): string {
  if (error instanceof AuthApiError) return error.message;
  if (!(error instanceof FirebaseError)) {
    return "We couldn't complete that request. Please try again.";
  }

  switch (error.code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address and try again.";
    case "auth/weak-password":
      return "Choose a stronger password and try again.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email or password is incorrect. Check your details and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a little while before trying again.";
    case "auth/popup-closed-by-user":
      return "The sign-in window was closed before finishing.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow popups and try again.";
    case "auth/unauthorized-domain":
      return "This site's domain is not authorized in Firebase Authentication yet.";
    case "auth/network-request-failed":
      return "We couldn't reach Firebase. Check your internet connection and try again.";
    case "auth/app-check-token-is-invalid":
    case "auth/app-check-token-is-missing":
      return "We couldn't verify this browser. Refresh the page and try again.";
    default:
      return "We couldn't complete that request. Please try again.";
  }
}
