const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ApiError,
  RESET_TOKEN_TTL_MS,
  allowedOrigin,
  createUuid,
  hashRateLimitKey,
  hashResetToken,
  isUuid,
  normalizeDisplayName,
  normalizeEmail,
  validatePassword,
  validateRegistration,
  validateResetCompletion,
} = require("./security");

test("generates Firebase-compatible canonical UUIDs", () => {
  const uid = createUuid();
  assert.match(uid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(isUuid(uid), true);
  assert.equal(isUuid("firebase-generated-non-uuid"), false);
});

test("normalizes safe profile and email fields", () => {
  assert.equal(normalizeDisplayName("  Alex \t Student "), "Alex Student");
  assert.equal(normalizeEmail("  USER@Example.COM "), "user@example.com");
  assert.throws(() => normalizeDisplayName(" \u0000 "), ApiError);
  assert.throws(() => normalizeEmail("bad email"), ApiError);
});

test("validates registration without mutating passwords", () => {
  const registration = validateRegistration({
    name: "Alex",
    email: "ALEX@example.com",
    password: " pass word ",
    termsAccepted: true,
  });
  assert.equal(registration.email, "alex@example.com");
  assert.equal(registration.password, " pass word ");
  assert.throws(
    () => validateRegistration({ name: "Alex", email: "alex@example.com", password: "long enough" }),
    ApiError,
  );
  assert.throws(
    () =>
      validateRegistration({
        name: "Alex",
        email: "alex@example.com",
        password: "long enough",
        termsAccepted: true,
        website: "spam",
      }),
    ApiError,
  );
  assert.throws(() => validatePassword("short"), ApiError);
});

test("enforces exact configured origins", () => {
  const configured = "https://bite.example,http://localhost:5173";
  assert.equal(allowedOrigin("https://bite.example", configured), true);
  assert.equal(allowedOrigin("https://bite.example.attacker.tld", configured), false);
  assert.equal(allowedOrigin("https://bite.example/", configured), false);
});

test("hashes reset tokens and requires a safe token shape", () => {
  const token = Buffer.alloc(32, 7).toString("base64url");
  assert.equal(hashResetToken(token).length, 64);
  assert.notEqual(hashRateLimitKey("same", "secret-a"), hashRateLimitKey("same", "secret-b"));
  assert.equal(RESET_TOKEN_TTL_MS, 30 * 60 * 1000);
  assert.equal(validateResetCompletion({ token, password: "long enough" }).token, token);
  assert.throws(() => validateResetCompletion({ token: "short", password: "long enough" }), ApiError);
});
