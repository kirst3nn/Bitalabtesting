const { randomBytes, randomUUID } = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getAppCheck } = require("firebase-admin/app-check");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, Timestamp, getFirestore } = require("firebase-admin/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");
const { onRequest, HttpsError } = require("firebase-functions/v2/https");
const { beforeUserCreated } = require("firebase-functions/v2/identity");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const {
  ApiError,
  RESET_TOKEN_TTL_MS,
  allowedOrigin,
  createUuid,
  escapeHtml,
  hashRateLimitKey,
  hashResetToken,
  isUuid,
  validateEmailRequest,
  validateRegistration,
  validateResetCompletion,
} = require("./security");

initializeApp();
setGlobalOptions({
  region: "us-central1",
  maxInstances: 5,
  memory: "256MiB",
  timeoutSeconds: 20,
});

const allowedOrigins = defineString("ALLOWED_ORIGINS", {
  default: "http://localhost:5173,http://127.0.0.1:5173",
});
const appBaseUrl = defineString("APP_BASE_URL", { default: "http://localhost:5173" });
const resendFromEmail = defineString("RESEND_FROM_EMAIL");
const resendApiKey = defineSecret("RESEND_API_KEY");
const rateLimitHmacSecret = defineSecret("RATE_LIMIT_HMAC_SECRET");
const db = getFirestore();
const auth = getAuth();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

class RateLimitError extends ApiError {
  constructor() {
    super(429, "rate_limited", "Too many attempts. Please wait before trying again.");
    this.name = "RateLimitError";
  }
}

function configuredAppBaseUrl() {
  let url;
  try {
    url = new URL(appBaseUrl.value());
  } catch {
    throw new ApiError(500, "server_configuration", "The account service is not configured.");
  }
  const basePath = url.pathname.replace(/\/+$/u, "");
  const hasUnsafePathSegment = basePath
    .split("/")
    .some((segment) => segment === "." || segment === "..");
  if (
    !["https:", "http:"].includes(url.protocol) ||
    hasUnsafePathSegment ||
    url.search ||
    url.hash ||
    (process.env.K_SERVICE && url.protocol !== "https:") ||
    !allowedOrigin(url.origin, allowedOrigins.value())
  ) {
    throw new ApiError(500, "server_configuration", "The account service is not configured.");
  }
  return `${url.origin}${basePath}`;
}

function setCorsHeaders(response, origin) {
  response.set("Access-Control-Allow-Origin", origin);
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Firebase-AppCheck");
  response.set("Access-Control-Max-Age", "600");
  response.set("Vary", "Origin");
  response.set("Cache-Control", "no-store");
}

function sendJson(response, status, payload) {
  return response.status(status).json(payload);
}

function requestId() {
  return randomUUID();
}

function publicFailure(error, event, id, response) {
  if (error instanceof ApiError && error.status < 500) {
    return sendJson(response, error.status, { ok: false, error: error.message });
  }

  const code =
    error instanceof ApiError
      ? error.code
      : typeof error?.code === "string"
        ? error.code
        : "unexpected";
  logger.error("auth_request_failed", { event, requestId: id, code });
  return sendJson(response, 500, {
    ok: false,
    error: "We couldn't complete that request. Please try again later.",
  });
}

function createEndpoint(event, options, action) {
  return onRequest(
    {
      cors: false,
      secrets: [rateLimitHmacSecret, ...(options.secrets || [])],
    },
    async (request, response) => {
      const id = requestId();
      const origin = request.get("origin");
      if (!allowedOrigin(origin, allowedOrigins.value())) {
        return sendJson(response, 403, { ok: false, error: "This site isn't allowed to make that request." });
      }
      setCorsHeaders(response, origin);

      if (request.method === "OPTIONS") {
        return response.status(204).end();
      }
      if (request.method !== "POST") {
        response.set("Allow", "POST, OPTIONS");
        return sendJson(response, 405, { ok: false, error: "This request method isn't supported." });
      }
      if (!request.is("application/json") || request.rawBody?.length > 16 * 1024) {
        return sendJson(response, 415, { ok: false, error: "Send a valid JSON request." });
      }

      try {
        const appCheckToken = request.get("x-firebase-appcheck");
        if (!appCheckToken) {
          throw new ApiError(401, "app_check_required", "Refresh the page and try again.");
        }
        try {
          await getAppCheck().verifyToken(appCheckToken);
        } catch {
          throw new ApiError(401, "invalid_app_check", "Refresh the page and try again.");
        }

        let user = null;
        if (options.authenticated) {
          const authorization = request.get("authorization") || "";
          const match = /^Bearer ([^\s]+)$/u.exec(authorization);
          if (!match) {
            throw new ApiError(401, "authentication_required", "Sign in and try again.");
          }
          let decoded;
          try {
            decoded = await auth.verifyIdToken(match[1], true);
          } catch {
            throw new ApiError(401, "invalid_session", "Sign in again and try again.");
          }
          if (!isUuid(decoded.uid)) {
            throw new ApiError(403, "invalid_account_id", "This account does not meet the account ID policy.");
          }
          user = decoded;
        }

        const responsePayload = await action({
          body: request.body,
          id,
          request,
          user,
        });
        return sendJson(response, responsePayload?.status || 200, {
          ok: true,
          ...(responsePayload?.body || {}),
        });
      } catch (error) {
        return publicFailure(error, event, id, response);
      }
    },
  );
}

async function takeRateLimit(key, maximum) {
  const now = Date.now();
  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
  const documentId = hashRateLimitKey(
    `${key}:${windowStart}`,
    rateLimitHmacSecret.value(),
  );
  const reference = db.collection("authRateLimits").doc(documentId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const count = snapshot.exists ? snapshot.get("count") : 0;
    if (count >= maximum) {
      throw new RateLimitError();
    }
    transaction.set(reference, {
      count: count + 1,
      expiresAt: Timestamp.fromMillis(windowStart + RATE_LIMIT_WINDOW_MS + 60 * 60 * 1000),
    });
  });
}

function requestIp(request) {
  return request.ip || request.socket?.remoteAddress || "unknown";
}

async function applyIpLimit(request, operation, maximum) {
  await takeRateLimit(`${operation}:ip:${requestIp(request)}`, maximum);
}

async function applyUserLimit(user, operation, maximum) {
  await takeRateLimit(`${operation}:uid:${user.uid}`, maximum);
}

function appContinueUrl(path) {
  const base = configuredAppBaseUrl();
  const url = new URL(base);
  url.pathname = `${url.pathname.replace(/\/+$/u, "")}${path}`;
  return url.toString();
}

function escapeHtmlAttribute(value) {
  return escapeHtml(value).replace(/`/gu, "&#96;");
}

async function sendEmail({ to, subject, html, text }) {
  const from = resendFromEmail.value().trim();
  if (!from || !resendApiKey.value()) {
    throw new ApiError(500, "mail_configuration", "Email delivery is not configured.");
  }
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey.value()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
    signal: AbortSignal.timeout(8000),
  });
  if (!result.ok) {
    logger.error("auth_email_delivery_failed", { status: result.status });
    throw new ApiError(502, "mail_delivery_failed", "Email delivery is temporarily unavailable.");
  }
}

function emailShell({ heading, body, button, url }) {
  const safeUrl = escapeHtmlAttribute(url);
  const safeHeading = escapeHtml(heading);
  const safeBody = escapeHtml(body);
  const safeButton = escapeHtml(button);
  return {
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#25231f"><h1>${safeHeading}</h1><p>${safeBody}</p><p><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;background:#df5e20;color:#fff;text-decoration:none;border-radius:8px">${safeButton}</a></p><p>If you did not request this, you can ignore this email.</p></div>`,
    text: `${heading}\n\n${body}\n\n${button}: ${url}\n\nIf you did not request this, you can ignore this email.`,
  };
}

async function verificationLink(email) {
  return auth.generateEmailVerificationLink(email, {
    url: appContinueUrl("/"),
    handleCodeInApp: true,
  });
}

exports.enforceUuidAuthUid = beforeUserCreated((event) => {
  if (!isUuid(event.data.uid)) {
    throw new HttpsError(
      "permission-denied",
      "New accounts must use Bite Lab's secure account creation flow.",
    );
  }
});

exports.registerWithUuid = createEndpoint(
  "register",
  { secrets: [resendApiKey] },
  async ({ body, request }) => {
    await applyIpLimit(request, "register", 5);
    const { name, email, password } = validateRegistration(body);
    const emailKey = hashRateLimitKey(`register:email:${email}`, rateLimitHmacSecret.value());
    await takeRateLimit(`register:email_hash:${emailKey}`, 3);
    const uid = createUuid();
    let user;
    try {
      user = await auth.createUser({
        uid,
        email,
        password,
        displayName: name,
        emailVerified: false,
      });
    } catch (error) {
      if (error?.code === "auth/email-already-exists") {
        try {
          const existing = await auth.getUserByEmail(email);
          if (isUuid(existing.uid) && existing.email && !existing.emailVerified) {
            const link = await verificationLink(existing.email);
            const emailContent = emailShell({
              heading: "Verify your Bite Lab email",
              body: "Confirm your email address to finish setting up your account.",
              button: "Verify email",
              url: link,
            });
            await sendEmail({
              to: existing.email,
              subject: "Verify your Bite Lab email",
              ...emailContent,
            });
          }
        } catch (verificationError) {
          logger.error("auth_duplicate_signup_verification_failed", {
            code: typeof verificationError?.code === "string" ? verificationError.code : "unexpected",
          });
        }
        return { body: { message: "If the account can be created, check your inbox for the next step." } };
      }
      throw error;
    }

    try {
      const link = await verificationLink(email);
      const emailContent = emailShell({
        heading: "Verify your Bite Lab email",
        body: "Confirm your email address to finish setting up your account.",
        button: "Verify email",
        url: link,
      });
      await sendEmail({
        to: email,
        subject: "Verify your Bite Lab email",
        ...emailContent,
      });
    } catch (error) {
      try {
        await auth.deleteUser(user.uid);
      } catch {
        logger.error("auth_signup_compensation_failed", { uid: user.uid });
      }
      logger.error("auth_signup_delivery_failed", {
        uid: user.uid,
        code: typeof error?.code === "string" ? error.code : "unexpected",
      });
      return {
        status: 202,
        body: { message: "If the account can be created, check your inbox for the next step." },
      };
    }

    logger.info("auth_account_created", { uid: user.uid, provider: "password" });
    return {
      status: 201,
      body: { message: "Account created. Check your inbox for the verification link." },
    };
  },
);

exports.createSocialShell = createEndpoint(
  "social_shell",
  {},
  async ({ request }) => {
    await applyIpLimit(request, "social_shell", 8);
    const uid = createUuid();
    let user;
    try {
      user = await auth.createUser({ uid, emailVerified: false });
      await auth.setCustomUserClaims(uid, { pendingSocial: true });
      const customToken = await auth.createCustomToken(uid);
      logger.info("auth_social_shell_created", { uid });
      return { body: { customToken } };
    } catch (error) {
      if (user) {
        try {
          await auth.deleteUser(uid);
        } catch {
          logger.error("auth_social_shell_compensation_failed", { uid });
        }
      }
      throw error;
    }
  },
);

exports.completeSocialAccount = createEndpoint(
  "social_complete",
  { authenticated: true },
  async ({ user }) => {
    await applyUserLimit(user, "social_complete", 8);
    const account = await auth.getUser(user.uid);
    if (
      !account.providerData.some((provider) =>
        ["google.com", "apple.com"].includes(provider.providerId),
      )
    ) {
      throw new ApiError(403, "provider_required", "Finish signing in with Google or Apple first.");
    }
    const claims = { ...account.customClaims };
    delete claims.pendingSocial;
    await auth.setCustomUserClaims(user.uid, claims);
    logger.info("auth_social_account_ready", { uid: user.uid });
    return { body: { message: "Social account ready." } };
  },
);

exports.cancelSocialShell = createEndpoint(
  "social_cancel",
  { authenticated: true },
  async ({ user }) => {
    await applyUserLimit(user, "social_cancel", 8);
    const account = await auth.getUser(user.uid);
    if (!account.customClaims?.pendingSocial || account.providerData.length > 0) {
      throw new ApiError(409, "social_account_in_use", "This account can no longer be cancelled.");
    }
    await auth.deleteUser(user.uid);
    logger.info("auth_social_shell_cancelled", { uid: user.uid });
    return { body: { message: "Pending account removed." } };
  },
);

exports.resendVerification = createEndpoint(
  "verification_resend",
  { authenticated: true, secrets: [resendApiKey] },
  async ({ user, request }) => {
    await applyIpLimit(request, "verification_resend", 5);
    await applyUserLimit(user, "verification_resend", 3);
    const account = await auth.getUser(user.uid);
    if (!account.emailVerified && account.email) {
      const link = await verificationLink(account.email);
      const emailContent = emailShell({
        heading: "Verify your Bite Lab email",
        body: "Use this link to verify your email address.",
        button: "Verify email",
        url: link,
      });
      await sendEmail({
        to: account.email,
        subject: "Your Bite Lab verification link",
        ...emailContent,
      });
    }
    return { body: { message: "If verification is still needed, a link has been sent." } };
  },
);

exports.requestPasswordReset = createEndpoint(
  "password_reset_request",
  { secrets: [resendApiKey] },
  async ({ body, request }) => {
    await applyIpLimit(request, "password_reset", 5);
    const { email } = validateEmailRequest(body);
    const baseUrl = configuredAppBaseUrl();
    const emailKey = hashRateLimitKey(
      `password_reset:email:${email}`,
      rateLimitHmacSecret.value(),
    );
    await takeRateLimit(`password_reset:email_hash:${emailKey}`, 3);

    let account;
    try {
      account = await auth.getUserByEmail(email);
    } catch (error) {
      if (error?.code === "auth/user-not-found") {
        return {
          status: 202,
          body: { message: "If an account exists for that email, a reset link will be sent." },
        };
      }
      throw error;
    }

    if (isUuid(account.uid) && account.email) {
      const token = randomBytes(32).toString("base64url");
      const tokenHash = hashResetToken(token);
      const expiresAt = Date.now() + RESET_TOKEN_TTL_MS;
      await db.collection("passwordResetTokens").doc(tokenHash).create({
        uid: account.uid,
        expiresAt: Timestamp.fromMillis(expiresAt),
        consumed: false,
      });
      const linkUrl = new URL(`${baseUrl}/`);
      linkUrl.searchParams.set("token", token);
      const emailContent = emailShell({
        heading: "Reset your Bite Lab password",
        body: "This single-use reset link expires in 30 minutes.",
        button: "Reset password",
        url: linkUrl.toString(),
      });
      try {
        await sendEmail({
          to: account.email,
          subject: "Reset your Bite Lab password",
          ...emailContent,
        });
      } catch (error) {
        try {
          await db.collection("passwordResetTokens").doc(tokenHash).delete();
        } catch {
          logger.error("auth_password_reset_token_cleanup_failed", { uid: account.uid });
        }
        logger.error("auth_password_reset_email_failed", {
          uid: account.uid,
          code: typeof error?.code === "string" ? error.code : "unexpected",
        });
      }
    }

    return {
      status: 202,
      body: { message: "If an account exists for that email, a reset link will be sent." },
    };
  },
);

exports.completePasswordReset = createEndpoint(
  "password_reset_complete",
  {},
  async ({ body, request }) => {
    await applyIpLimit(request, "password_reset_complete", 10);
    const { token, password } = validateResetCompletion(body);
    const tokenHash = hashResetToken(token);
    const reference = db.collection("passwordResetTokens").doc(tokenHash);
    let uid;

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const expiry = snapshot.get("expiresAt")?.toMillis();
      if (
        !snapshot.exists ||
        snapshot.get("consumed") ||
        !Number.isFinite(expiry) ||
        expiry <= Date.now() ||
        !isUuid(snapshot.get("uid"))
      ) {
        throw new ApiError(400, "invalid_reset_link", "This reset link is invalid or expired. Request a new one.");
      }
      uid = snapshot.get("uid");
      transaction.update(reference, { consumed: true, consumedAt: FieldValue.serverTimestamp() });
    });

    try {
      await auth.updateUser(uid, { password });
      await auth.revokeRefreshTokens(uid);
    } catch (error) {
      logger.error("auth_password_reset_update_failed", {
        uid,
        code: typeof error?.code === "string" ? error.code : "unexpected",
      });
      throw new ApiError(500, "password_update_failed", "We couldn't change your password. Request a new link and try again.");
    }

    logger.info("auth_password_reset_completed", { uid });
    return { body: { message: "Password updated. You can now log in." } };
  },
);
