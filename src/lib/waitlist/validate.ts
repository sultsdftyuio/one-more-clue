const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Trimmed, lower-cased email, or null if it isn't a plausible address. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

/** Short slug for the traffic source; anything odd collapses to "direct". */
export function cleanSource(raw: unknown): string {
  if (typeof raw !== "string") return "direct";
  const source = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  return source || "direct";
}
