export function normalizeEmail(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

export function normalizeDisplayName(value: string): string {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(value);
}

export function isValidDisplayName(value: string): boolean {
  return (
    value.length > 0 &&
    Array.from(value).length <= 80 &&
    !/[\u0000-\u001f\u007f-\u009f]/u.test(value)
  );
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}
