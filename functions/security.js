const { createHash, createHmac, randomUUID } = require("node:crypto");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const RESET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/u;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function requireRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "invalid_request", "Check the submitted information and try again.");
  }
  return value;
}

function normalizeEmail(value) {
  if (typeof value !== "string") {
    throw new ApiError(400, "invalid_email", "Enter a valid email address.");
  }
  const email = value.normalize("NFKC").trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, "invalid_email", "Enter a valid email address.");
  }
  return email;
}

function normalizeDisplayName(value) {
  if (typeof value !== "string") {
    throw new ApiError(400, "invalid_name", "Enter a name between 1 and 80 characters.");
  }
  const name = value.normalize("NFKC").replace(/\s+/gu, " ").trim();
  const length = Array.from(name).length;
  if (!name || length > 80 || CONTROL_CHARACTERS.test(name)) {
    throw new ApiError(400, "invalid_name", "Enter a name between 1 and 80 characters.");
  }
  return name;
}

function validatePassword(value) {
  if (
    typeof value !== "string" ||
    Array.from(value).length < 8 ||
    Array.from(value).length > 128 ||
    Buffer.byteLength(value, "utf8") > 512
  ) {
    throw new ApiError(400, "invalid_password", "Choose a password between 8 and 128 characters.");
  }
  return value;
}

function validateRegistration(value) {
  const body = requireRecord(value);
  if (body.termsAccepted !== true) {
    throw new ApiError(400, "terms_required", "Accept the Terms and Privacy Policy to create an account.");
  }
  if (typeof body.website === "string" && body.website.trim()) {
    throw new ApiError(400, "invalid_request", "We couldn't complete that request.");
  }
  return {
    name: normalizeDisplayName(body.name),
    email: normalizeEmail(body.email),
    password: validatePassword(body.password),
  };
}

function validateEmailRequest(value) {
  const body = requireRecord(value);
  return { email: normalizeEmail(body.email) };
}

function validateResetCompletion(value) {
  const body = requireRecord(value);
  if (typeof body.token !== "string" || !RESET_TOKEN_PATTERN.test(body.token)) {
    throw new ApiError(400, "invalid_reset_link", "This reset link is invalid or expired. Request a new one.");
  }
  return { token: body.token, password: validatePassword(body.password) };
}

function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function createUuid() {
  return randomUUID();
}

function hashResetToken(token) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function hashRateLimitKey(key, secret) {
  return createHmac("sha256", secret).update(key, "utf8").digest("hex");
}

function allowedOrigin(origin, configuredOrigins) {
  if (typeof origin !== "string" || !origin || typeof configuredOrigins !== "string") {
    return false;
  }
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (!["https:", "http:"].includes(parsed.protocol) || parsed.origin !== origin) {
    return false;
  }
  return configuredOrigins
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .includes(origin);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/gu, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

module.exports = {
  ApiError,
  RESET_TOKEN_TTL_MS,
  allowedOrigin,
  createUuid,
  escapeHtml,
  hashRateLimitKey,
  hashResetToken,
  isUuid,
  normalizeDisplayName,
  normalizeEmail,
  validateEmailRequest,
  validatePassword,
  validateRegistration,
  validateResetCompletion,
};
