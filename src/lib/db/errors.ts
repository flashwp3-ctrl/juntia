const kinds = {
  JT001: "notAuthenticated", JT002: "invalidAmount", JT003: "amountOutOfRange", JT004: "invalidType",
  JT005: "invalidCategory", JT006: "invalidDate", JT007: "descriptionTooLong", JT008: "idempotencyKeyReused",
  JT009: "invalidIdempotencyKey", JT010: "transactionNotFound", JT011: "versionConflict", JT012: "transactionVoided",
  JT013: "immutableField", JT014: "invalidDisplayName", JT015: "invalidTheme", JT017: "invalidVoidReason",
  "40P01": "retryable", "40001": "retryable", "23514": "constraintViolation", "23503": "constraintViolation",
  "23505": "constraintViolation", "42501": "forbidden", PGRST301: "notAuthenticated",
} as const;
export type DbErrorKind = (typeof kinds)[keyof typeof kinds] | "unexpected" | "network" | "retryExhausted";
export class DbError extends Error {
  constructor(readonly kind: DbErrorKind) { super(kind); this.name = "DbError"; }
}
export function mapDbError(error: unknown): DbError {
  if (error instanceof DbError) return error;
  if (error instanceof TypeError || (error instanceof Error && error.name === "AbortError")) return new DbError("network");
  if (typeof error === "object" && error !== null) {
    if ("status" in error && error.status === 401) return new DbError("notAuthenticated");
    if ("code" in error && typeof error.code === "string" && Object.hasOwn(kinds, error.code)) return new DbError(kinds[error.code as keyof typeof kinds]);
  }
  return new DbError("unexpected");
}
