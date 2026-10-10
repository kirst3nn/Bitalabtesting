import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  linkWithPopup,
  onAuthStateChanged,
  reload,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { Eye, EyeOff, Mail, UtensilsCrossed } from "lucide-react";
import {
  appleProvider,
  firebaseAppCheck,
  firebaseAuth,
  firebaseConfigured,
  getFirebaseAuthMessage,
  googleProvider,
  logSafeAuthError,
  requestAuthApi,
} from "./lib/firebase";
import {
  isValidDisplayName,
  isValidEmail,
  isUuid,
  normalizeDisplayName,
  normalizeEmail,
} from "./lib/input";

type AuthMode = "login" | "signup" | "reset" | "reset-finish";

type Member = {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
};

function AnimatedButtonContent({ children }: { children: ReactNode }) {
  return (
    <>
      <svg viewBox="0 0 24 24" className="animated-arrow arr-2" aria-hidden="true">
        <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
      </svg>
      <span className="animated-button-label">{children}</span>
      <span className="circle" aria-hidden="true" />
      <svg viewBox="0 0 24 24" className="animated-arrow arr-1" aria-hidden="true">
        <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
      </svg>
    </>
  );
}

function asMember(user: User): Member {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
  };
}

function errorCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string"
    ? error.code
    : "";
}

function App() {
  const [mode, setMode] = useState<AuthMode>(() =>
    new URLSearchParams(window.location.search).has("token") ? "reset-finish" : "login",
  );
  const [resetToken, setResetToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") ?? "";
    if (token) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.hash}`,
      );
    }
    return token;
  });
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const socialFlowRef = useRef(false);

  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false);
      return undefined;
    }
    const authInstance = firebaseAuth;

    const unsubscribe = onAuthStateChanged(
      authInstance,
      (user) => {
        if (user && !isUuid(user.uid)) {
          void signOut(authInstance).catch((error: unknown) => {
            logSafeAuthError("non_uuid_session_sign_out_failed", error);
          });
          setMember(null);
          setMessage("This account does not meet Bite Lab's account ID security policy.");
          setIsError(true);
        } else if (user && !user.email && user.providerData.length === 0) {
          setMember(null);
          if (!socialFlowRef.current) {
            void requestAuthApi("cancelSocialShell", {}, { authenticated: true })
              .catch((error: unknown) => {
                logSafeAuthError("stale_social_shell_cleanup_failed", error);
              })
              .finally(() => {
                void signOut(authInstance).catch((error: unknown) => {
                  logSafeAuthError("stale_social_shell_sign_out_failed", error);
                });
              });
          }
        } else {
          setMember(user ? asMember(user) : null);
        }
        setLoading(false);
      },
      (error) => {
        logSafeAuthError("auth_session_listener_failed", error);
        setMessage(getFirebaseAuthMessage(error));
        setIsError(true);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setIsError(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (nextMode !== "reset-finish" && resetToken) {
      setResetToken("");
    }
  }

  function updateMessage(text: string, error = false) {
    setMessage(text);
    setIsError(error);
  }

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firebaseAuth) {
      updateMessage("Firebase isn't configured yet. Add its web app settings and restart the site.", true);
      return;
    }

    const form = event.currentTarget;
    const fields = new FormData(form);
    const email = normalizeEmail(String(fields.get("email") ?? ""));
    const password = String(fields.get("password") ?? "");
    const honeypot = String(fields.get("website") ?? "");
    if (honeypot) {
      updateMessage("We couldn't complete that request. Please try again.", true);
      return;
    }
    if (mode !== "reset" && mode !== "signup" && mode !== "login") return;
    if (mode !== "reset" && (!isValidEmail(email) || password.length < 8 || password.length > 128)) {
      updateMessage("Check your email and password, then try again.", true);
      return;
    }
    if (mode === "reset" && !isValidEmail(email)) {
      updateMessage("Enter a valid email address and try again.", true);
      return;
    }

    setBusy(true);
    updateMessage("");

    if (mode === "reset") {
      try {
        await requestAuthApi<{ message: string }>("requestPasswordReset", { email });
        updateMessage("If an account exists for that email, a reset link will be sent.");
      } catch (error) {
        logSafeAuthError("password_reset_request_failed", error);
        updateMessage(getFirebaseAuthMessage(error), true);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "signup") {
      const name = normalizeDisplayName(String(fields.get("name") ?? ""));
      const confirmation = String(fields.get("confirmPassword") ?? "");
      if (!isValidDisplayName(name)) {
        setBusy(false);
        updateMessage("Enter a name between 1 and 80 characters.", true);
        return;
      }
      if (password !== confirmation) {
        setBusy(false);
        updateMessage("Those passwords don't match. Please check and try again.", true);
        return;
      }

      try {
        await requestAuthApi<{ message: string }>("registerWithUuid", {
          name,
          email,
          password,
          termsAccepted: fields.get("terms") === "on",
          website: honeypot,
        });
        const credentials = await signInWithEmailAndPassword(firebaseAuth, email, password);
        setMember(asMember(credentials.user));
        form.reset();
        setShowPassword(false);
        setShowConfirmPassword(false);
        updateMessage(
          credentials.user.emailVerified
            ? ""
            : "Account ready. Check your inbox and verify your email before ordering.",
        );
      } catch (error) {
        logSafeAuthError("account_registration_failed", error);
        updateMessage(getFirebaseAuthMessage(error), true);
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      const credentials = await signInWithEmailAndPassword(firebaseAuth, email, password);
      if (!isUuid(credentials.user.uid)) {
        await signOut(firebaseAuth);
        updateMessage("This account does not meet Bite Lab's account ID security policy.", true);
        return;
      }
      setMember(asMember(credentials.user));
      form.reset();
      setShowPassword(false);
      updateMessage("");
    } catch (error) {
      logSafeAuthError("email_password_sign_in_failed", error);
      updateMessage(getFirebaseAuthMessage(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function cancelEmptySocialAccount() {
    if (!firebaseAuth?.currentUser) return;
    try {
      await requestAuthApi("cancelSocialShell", {}, { authenticated: true });
    } catch (error) {
      logSafeAuthError("social_shell_cleanup_failed", error);
    }
    await signOut(firebaseAuth);
  }

  async function finishSocialSignIn(user: User) {
    if (!isUuid(user.uid)) {
      await signOut(firebaseAuth!);
      throw new Error("This social account does not meet Bite Lab's UUID account policy.");
    }
    await requestAuthApi("completeSocialAccount", {}, { authenticated: true });
    await reload(user);
    setMember(asMember(user));
  }

  async function signInWithProvider(providerName: "google" | "apple") {
    const provider =
      providerName === "google" ? googleProvider : appleProvider;
    if (!firebaseAuth || !provider) {
      updateMessage("Firebase isn't configured yet. Add its web app settings before signing in.", true);
      return;
    }

    setBusy(true);
    updateMessage("");
    let pendingUid: string | null = null;
    try {
      const shell = await requestAuthApi<{ customToken: string }>("createSocialShell", {});
      socialFlowRef.current = true;
      await signInWithCustomToken(firebaseAuth, shell.customToken);
      const pendingUser = firebaseAuth.currentUser;
      if (!pendingUser || !isUuid(pendingUser.uid)) {
        throw new Error("The secure account service returned an invalid account.");
      }
      pendingUid = pendingUser.uid;

      try {
        const linked = await linkWithPopup(pendingUser, provider);
        await finishSocialSignIn(linked.user);
      } catch (error) {
        if (errorCode(error) !== "auth/credential-already-in-use") throw error;

        await cancelEmptySocialAccount();
        pendingUid = null;
        const existing = await signInWithPopup(firebaseAuth, provider);
        await finishSocialSignIn(existing.user);
      }
    } catch (error) {
      if (pendingUid && firebaseAuth.currentUser?.uid === pendingUid) {
        await cancelEmptySocialAccount();
      }
      logSafeAuthError(`${providerName}_sign_in_failed`, error);
      updateMessage(getFirebaseAuthMessage(error), true);
    } finally {
      socialFlowRef.current = false;
      setBusy(false);
    }
  }

  async function submitResetCompletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetToken) {
      updateMessage("This reset link is invalid or expired. Request a new one.", true);
      return;
    }
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get("newPassword") ?? "");
    const confirmation = String(fields.get("confirmNewPassword") ?? "");
    if (password.length < 8 || password.length > 128) {
      updateMessage("Choose a password between 8 and 128 characters.", true);
      return;
    }
    if (password !== confirmation) {
      updateMessage("Those passwords don't match. Please check and try again.", true);
      return;
    }

    setBusy(true);
    updateMessage("");
    try {
      await requestAuthApi<{ message: string }>("completePasswordReset", {
        token: resetToken,
        password,
      });
      setResetToken("");
      switchMode("login");
      updateMessage("Password updated. You can now log in.");
    } catch (error) {
      logSafeAuthError("password_reset_completion_failed", error);
      updateMessage(getFirebaseAuthMessage(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function refreshVerification() {
    if (!firebaseAuth?.currentUser) {
      updateMessage("Sign in again to check your email verification status.", true);
      return;
    }

    setBusy(true);
    updateMessage("");
    try {
      await reload(firebaseAuth.currentUser);
      setMember(asMember(firebaseAuth.currentUser));
      updateMessage(
        firebaseAuth.currentUser.emailVerified
          ? "Email verified. You're all set!"
          : "We haven't received verification yet. Open the email link, then try again.",
      );
    } catch (error) {
      logSafeAuthError("verification_status_refresh_failed", error);
      updateMessage(getFirebaseAuthMessage(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    if (!firebaseAuth?.currentUser) {
      updateMessage("Sign in again to resend your verification email.", true);
      return;
    }

    setBusy(true);
    updateMessage("");
    try {
      const result = await requestAuthApi<{ message: string }>(
        "resendVerification",
        {},
        { authenticated: true },
      );
      updateMessage(result.message);
    } catch (error) {
      logSafeAuthError("verification_email_resend_failed", error);
      updateMessage(getFirebaseAuthMessage(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function signOutMember() {
    if (!firebaseAuth) return;
    setBusy(true);
    try {
      await signOut(firebaseAuth);
      setMember(null);
      switchMode("login");
      updateMessage("You're signed out.");
    } catch (error) {
      logSafeAuthError("sign_out_failed", error);
      updateMessage(getFirebaseAuthMessage(error), true);
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "signup"
      ? "Your next favorite meal starts here."
      : mode === "reset"
        ? "Let's get you back in."
        : mode === "reset-finish"
          ? "Choose a new password."
          : "Good food. Good mood. You're in.";

  return (
    <main className="page-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="brand-panel">
          <a className="brand" href={import.meta.env.BASE_URL} aria-label="Bite Lab home">
            <span className="brand-mark"><UtensilsCrossed size={20} strokeWidth={2.5} /></span>
            <span>BITE<span className="brand-accent">LAB</span></span>
          </a>

          <div className="brand-content">
            <span className="eyebrow">GOOD FOOD. STUDENT PRICES.</span>
            <h1>Big flavor<br />for campus life.</h1>
            <p>Find your new favorite, build your own, and make lunch the best part of your day.</p>
            <div className="food-art" aria-hidden="true">
              <span className="food-art-glow" />
              <span className="food-art-emoji">🍔</span>
              <span className="food-art-chip">Made for your kind of hungry</span>
              <span className="food-art-spark spark-one">✳</span>
              <span className="food-art-spark spark-two">✦</span>
            </div>
          </div>

          <p className="brand-footer">Fresh bites, good vibes. © 2026 Bite Lab.</p>
        </div>

        <div className="form-panel">
          {loading ? (
            <div className="loading-state" role="status">Loading your Bite Lab account…</div>
          ) : member && mode !== "reset-finish" ? (
            <div className="member-state">
              <span className="eyebrow">YOUR BITE LAB ACCOUNT</span>
              <h2 id="auth-title">
                {member.emailVerified ? "You're on the list." : "One last little step."}
              </h2>
              <p className="form-intro">
                {member.emailVerified
                  ? `Welcome${member.displayName ? `, ${member.displayName}` : ""}! You're signed in as ${member.email}.`
                  : `We sent a verification link to ${member.email}. Verify your email to finish setting up your account.`}
              </p>

              {!member.emailVerified && member.email && (
                <div className="verification-actions">
                  <button className="primary-button animated-button" type="button" disabled={busy} onClick={() => void refreshVerification()}>
                    <AnimatedButtonContent>I verified my email</AnimatedButtonContent>
                  </button>
                  <button className="secondary-button text-button animated-button" type="button" disabled={busy} onClick={() => void resendVerification()}>
                    <AnimatedButtonContent>Resend verification email</AnimatedButtonContent>
                  </button>
                </div>
              )}

              <button className="secondary-button sign-out-button animated-button" type="button" disabled={busy} onClick={() => void signOutMember()}>
                <AnimatedButtonContent>Sign out</AnimatedButtonContent>
              </button>

              <p className={`feedback${isError ? " feedback-error" : ""}`} aria-live="polite">{message}</p>
            </div>
          ) : (
            <>
              <span className="eyebrow form-eyebrow">
                {mode === "signup" ? "JOIN THE GOOD STUFF" : mode.startsWith("reset") ? "PASSWORD RESET" : "WELCOME TO BITE LAB"}
              </span>
              <h2 id="auth-title">{title}</h2>
              <p className="form-intro">
                {mode === "signup"
                  ? "Create your account to get started. We’ll email you a link to verify your address."
                  : mode === "reset"
                    ? "Enter your account email and we'll send you a single-use reset link that expires in 30 minutes."
                    : mode === "reset-finish"
                      ? "Create a new password. Reset links can only be used once and expire after 30 minutes."
                      : "Log in for more of the meals and combos you love."}
              </p>

              {mode !== "reset" && mode !== "reset-finish" && (
                <div className="social-buttons">
                  <button className="social-button animated-button" type="button" disabled={busy || !firebaseConfigured} onClick={() => void signInWithProvider("google")}>
                    <AnimatedButtonContent>
                      <svg viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z" />
                        <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z" />
                        <path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z" />
                        <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z" />
                      </svg>
                      Google
                    </AnimatedButtonContent>
                  </button>
                  <button className="social-button animated-button" type="button" disabled={busy || !firebaseConfigured} onClick={() => void signInWithProvider("apple")}>
                    <AnimatedButtonContent>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="currentColor" d="M16.37 12.29c.02 2.07 1.82 2.76 1.84 2.77-.02.05-.29 1-.96 1.98-.58.85-1.19 1.69-2.14 1.71-.93.02-1.23-.55-2.29-.55-1.05 0-1.39.53-2.26.57-.91.03-1.61-.92-2.2-1.77-1.2-1.74-2.12-4.91-.89-7.05.61-1.06 1.7-1.73 2.89-1.75.9-.02 1.74.61 2.29.61.54 0 1.56-.75 2.63-.64.45.02 1.72.18 2.54 1.37-.07.04-1.52.89-1.5 2.75ZM14.64 7.7c.48-.58.81-1.39.72-2.2-.7.03-1.55.47-2.05 1.04-.45.51-.85 1.33-.74 2.12.78.06 1.59-.39 2.07-.96Z" />
                      </svg>
                      Apple
                    </AnimatedButtonContent>
                  </button>
                </div>
              )}

              {mode !== "reset" && mode !== "reset-finish" && (
                <div className="divider"><span>or continue with email</span></div>
              )}

              {mode === "reset-finish" ? (
                <form className="auth-form" onSubmit={(event) => void submitResetCompletion(event)} autoComplete="on">
                  <label htmlFor="newPassword">New password</label>
                  <div className="input-wrap">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      disabled={busy}
                      required
                    />
                    <button className="password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-controls="newPassword" aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <label htmlFor="confirmNewPassword">Confirm new password</label>
                  <div className="input-wrap">
                    <input
                      id="confirmNewPassword"
                      name="confirmNewPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      disabled={busy}
                      required
                    />
                    <button className="password-toggle" type="button" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} aria-controls="confirmNewPassword" aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((visible) => !visible)}>
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button className="primary-button submit-button animated-button" type="submit" disabled={busy || !resetToken}>
                    <AnimatedButtonContent>{busy ? "Please wait…" : "Update password"}</AnimatedButtonContent>
                  </button>
                </form>
              ) : (
                <form className="auth-form" onSubmit={(event) => void submitCredentials(event)} autoComplete="on">
                  {mode === "signup" && (
                    <>
                      <label htmlFor="displayName">Your name</label>
                      <input id="displayName" name="name" type="text" autoComplete="name" maxLength={80} placeholder="Alex Student" disabled={busy} required />
                    </>
                  )}

                  <label htmlFor="email">Email address</label>
                  <div className="input-wrap">
                    <Mail size={17} aria-hidden="true" />
                    <input id="email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" disabled={busy} required />
                  </div>

                  {mode !== "reset" && (
                    <>
                      <div className="password-label">
                        <label htmlFor="password">Password</label>
                        {mode === "login" && (
                          <button className="inline-link" type="button" onClick={() => switchMode("reset")}>
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="input-wrap">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete={mode === "signup" ? "new-password" : "current-password"}
                          minLength={8}
                          maxLength={128}
                          placeholder="At least 8 characters"
                          disabled={busy}
                          required
                        />
                        <button className="password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-controls="password" aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </>
                  )}

                  {mode === "signup" && (
                    <>
                      <label htmlFor="confirmPassword">Confirm password</label>
                      <div className="input-wrap">
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          minLength={8}
                          maxLength={128}
                          placeholder="Re-enter your password"
                          disabled={busy}
                          required
                        />
                        <button className="password-toggle" type="button" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} aria-controls="confirmPassword" aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((visible) => !visible)}>
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <label className="terms-check">
                        <input type="checkbox" name="terms" required />
                        <span>I agree to the <a href={`${import.meta.env.BASE_URL}terms.html`} target="_blank" rel="noreferrer">Terms</a> and <a href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noreferrer">Privacy Policy</a>.</span>
                      </label>
                      <div className="honeypot" aria-hidden="true">
                        <label htmlFor="website">Website</label>
                        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                      </div>
                    </>
                  )}

                  <button className="primary-button submit-button animated-button" type="submit" disabled={busy}>
                    <AnimatedButtonContent>
                      {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Log in"}
                    </AnimatedButtonContent>
                  </button>
                </form>
              )}

              {!firebaseConfigured && (
                <p className="setup-note" role="status">
                  Firebase is not configured yet. Copy <code>.env.example</code> to <code>.env.local</code> and add your Firebase web app settings.
                </p>
              )}

              {firebaseConfigured && !resetToken && mode === "reset-finish" && (
                <p className="setup-note" role="status">This reset link is invalid or expired. Request a new link to continue.</p>
              )}

              {firebaseConfigured && mode !== "reset-finish" && !firebaseAppCheck && (
                <p className="setup-note" role="status">
                  Protected account actions need the Firebase App Check site key in <code>.env.local</code>.
                </p>
              )}

              <p className={`feedback${isError ? " feedback-error" : ""}`} aria-live="polite">{message}</p>

              <p className="mode-switch">
                {mode === "signup" ? "Already have an account?" : mode === "reset" || mode === "reset-finish" ? "Remember your password?" : "New to Bite Lab?"}
                {" "}
                <button type="button" onClick={() => switchMode(mode === "signup" || mode.startsWith("reset") ? "login" : "signup")}>
                  {mode === "signup" || mode.startsWith("reset") ? "Log in" : "Create an account"}
                </button>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
