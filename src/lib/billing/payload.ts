/**
 * Defensive readers for Dodo webhook and API payloads. Both are treated as
 * untyped records: field names have varied between API versions, and a missing
 * field must never be mistaken for a paid state.
 */
export type DodoRecord = Record<string, unknown>;

export function asRecord(value: unknown): DodoRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as DodoRecord) : null;
}

export function readString(record: DodoRecord | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readNumber(record: DodoRecord | null, key: string) {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function topLevelKeys(record: DodoRecord | null) {
  return record ? Object.keys(record).sort() : [];
}

export function serializeError(error: unknown) {
  return error instanceof Error ? { name: error.name, message: error.message } : { value: String(error) };
}

/** The buyer and case that checkout attached as metadata (copied onto different objects per event). */
export function readCheckoutMetadata(record: DodoRecord) {
  const sources = [record.metadata, asRecord(record.payment)?.metadata, asRecord(record.checkout_session)?.metadata].map(asRecord);
  for (const metadata of sources) {
    const userId = readString(metadata, "user_id");
    const caseId = readString(metadata, "case_id");
    if (userId && caseId) return { userId, caseId };
  }
  return null;
}
